const API = "https://mednet-s41z.onrender.com";
const speedEl = document.getElementById("speed");
const pingEl = document.getElementById("ping");
const jitterEl = document.getElementById("jitter");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const startBtn = document.getElementById("startBtn");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 250;

let chartData = [];
let animationFrameId = null;

// --- FUNÇÃO DO GRÁFICO DINÂMICO GRADIENTE COM GRADE ---
function drawChart() {
    // Fundo escuro semi-transparente para dar contraste às linhas
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const padding = 40;
    
    // Desenhar Linhas de Grade de Fundo (Estilo Painel Profissional)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = padding; i < canvas.width - padding; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, padding);
        ctx.lineTo(i, canvas.height - padding);
        ctx.stroke();
    }
    for (let i = padding; i < canvas.height - padding; i += 40) {
        ctx.beginPath();
        ctx.moveTo(padding, i);
        ctx.lineTo(canvas.width - padding, i);
        ctx.stroke();
    }

    if (chartData.length === 0) return;

    // Criar o gradiente azul neon para preenchimento abaixo da linha
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0, 240, 255, 0.3)");
    gradient.addColorStop(1, "rgba(0, 240, 255, 0)");

    ctx.beginPath();
    const maxVal = Math.max(...chartData, 10); 
    
    // Mapear e desenhar a linha do gráfico
    for (let i = 0; i < chartData.length; i++) {
        const x = (i / (chartData.length - 1 || 1)) * (canvas.width - padding * 2) + padding;
        const y = canvas.height - ((chartData[i] / maxVal) * (canvas.height - padding * 2) + padding);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    // Configuração da Linha Neon Ciano Viva
    ctx.strokeStyle = "#00f0ff"; 
    ctx.lineWidth = 4;           
    ctx.stroke();

    // Pintar o preenchimento por baixo da linha
    const firstX = padding;
    const lastX = (canvas.width - padding * 2) + padding;
    ctx.lineTo(lastX, canvas.height - padding);
    ctx.lineTo(firstX, canvas.height - padding);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Loop contínuo de renderização por quadro
    animationFrameId = requestAnimationFrame(drawChart);
}

// --- TESTE DE PING E JITTER ---
async function runPingTest() {
    let pings = [];
    for (let i = 0; i < 5; i++) {
        const start = performance.now();
        try {
            await fetch(`${API}/ping`, { cache: 'no-store' });
            pings.push(performance.now() - start);
        } catch (e) {
            console.error("Erro no ping", e);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    const ping = pings.reduce((a, b) => a + b, 0) / pings.length;
    let jitter = 0;
    for (let i = 1; i < pings.length; i++) {
        jitter += Math.abs(pings[i] - pings[i - 1]);
    }
    jitter = jitter / (pings.length - 1);

    pingEl.innerText = `${ping.toFixed(1)} ms`;
    jitterEl.innerText = `${jitter.toFixed(1)} ms`;
}

// --- TESTE DE DOWNLOAD ---
async function runDownloadTest() {
    chartData = []; 
    if (!animationFrameId) drawChart();

    const startTime = performance.now();
    try {
        const response = await fetch(`${API}/download`, { cache: 'no-store' });
        const reader = response.body.getReader();
        let loadedBytes = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            loadedBytes += value.length;
            const duration = (performance.now() - startTime) / 1000; 
            
            if (duration > 0) {
                const currentMbps = ((loadedBytes * 8) / 1000000) / duration;
                speedEl.innerText = currentMbps.toFixed(2);
                downloadEl.innerText = `${currentMbps.toFixed(2)} Mbps`;
                chartData.push(currentMbps); // Adiciona ao gráfico instantaneamente
            }
        }
    } catch (e) {
        console.error("Erro no download", e);
    }
}

// --- TESTE DE UPLOAD (EM RAJADAS DE BLOCOS SEGUROS) ---
async function runUploadTest() {
    // Envia blocos de 1 Megabyte repetidamente por 5 segundos
    const blobSize = 1 * 1024 * 1024; 
    const blobData = new Blob([new Uint8Array(blobSize)]);
    
    let totalBytesUploaded = 0;
    const testDuration = 5000; 
    const startTime = performance.now();

    while (performance.now() - startTime < testDuration) {
        try {
            await fetch(`${API}/upload`, {
                method: "POST",
                body: blobData,
                headers: { "Content-Type": "application/octet-stream" }
            });

            totalBytesUploaded += blobSize;
            const totalDuration = (performance.now() - startTime) / 1000;
            const currentMbps = ((totalBytesUploaded * 8) / 1000000) / totalDuration;

            speedEl.innerText = currentMbps.toFixed(2);
            uploadEl.innerText = `${currentMbps.toFixed(2)} Mbps`;
            chartData.push(currentMbps); // Alimenta o gráfico no upload também

        } catch (e) {
            console.error("Erro no envio de bloco de upload", e);
            break; 
        }
    }
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

// --- GATILHO ---
startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Testando...";
    
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    await runPingTest();
    await runDownloadTest();
    
    await new Promise(r => setTimeout(r, 1000)); // Pequena pausa de estabilização
    
    await runUploadTest();

    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
});
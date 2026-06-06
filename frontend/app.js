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

// --- FUNÇÃO DO GRÁFICO DINÂMICO ---
function drawChart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (chartData.length === 0) return;

    // Criar o gradiente azul para preenchimento abaixo da linha
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
    gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

    ctx.beginPath();
    
    // Descobrir o maior valor para escalar o gráfico dinamicamente
    const maxVal = Math.max(...chartData, 10); 
    const padding = 40;
    
    // Desenhar a linha do gráfico
    for (let i = 0; i < chartData.length; i++) {
        // Distribui os pontos horizontalmente ao longo do canvas
        const x = (i / (chartData.length - 1 || 1)) * (canvas.width - padding * 2) + padding;
        // Calcula a altura invertida (já que o Y do canvas começa no topo)
        const y = canvas.height - ((chartData[i] / maxVal) * (canvas.height - padding * 2) + padding);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00d4ff";
    ctx.stroke();
    ctx.shadowBlur = 0; // Reseta a sombra para não borrar o resto

    // Fecha a área para pintar o gradiente por baixo
    const firstX = padding;
    const lastX = (canvas.width - padding * 2) + padding;
    ctx.lineTo(lastX, canvas.height);
    ctx.lineTo(firstX, canvas.height);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Loop de animação contínua
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
    chartData = []; // Limpa o gráfico para o novo teste
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
            const duration = (performance.now() - startTime) / 1000; // segundos
            
            if (duration > 0) {
                // Cálculo de Mbps: (Bytes * 8) / bits em 1 Megabit / segundos
                const currentMbps = ((loadedBytes * 8) / 1000000) / duration;
                
                speedEl.innerText = currentMbps.toFixed(2);
                downloadEl.innerText = `${currentMbps.toFixed(2)} Mbps`;
                
                // Adiciona o ponto ao gráfico para fazê-lo oscilar dinamicamente
                chartData.push(currentMbps);
            }
        }
    } catch (e) {
        console.error("Erro no download", e);
    }
}

// --- TESTE DE UPLOAD (EM RAJADAS DE BLOCOS) ---
async function runUploadTest() {
    // Gerar um bloco leve de dados binários (1 Megabyte fixo)
    const blobSize = 1 * 1024 * 1024; 
    const blobData = new Blob([new Uint8Array(blobSize)]);
    
    let totalBytesUploaded = 0;
    const testDuration = 5000; // 5 segundos de teste limite
    const startTime = performance.now();

    while (performance.now() - startTime < testDuration) {
        const chunkStart = performance.now();
        
        try {
            // Envia o bloco de 1MB de forma direta
            await fetch(`${API}/upload`, {
                method: "POST",
                body: blobData,
                headers: { "Content-Type": "application/octet-stream" }
            });

            const chunkEnd = performance.now();
            totalBytesUploaded += blobSize;

            const totalDuration = (chunkEnd - startTime) / 1000;
            const currentMbps = ((totalBytesUploaded * 8) / 1000000) / totalDuration;

            // Atualiza os elementos visuais na hora
            speedEl.innerText = currentMbps.toFixed(2);
            uploadEl.innerText = `${currentMbps.toFixed(2)} Mbps`;
            
            // Alimenta o gráfico durante o upload também!
            chartData.push(currentMbps);

        } catch (e) {
            console.error("Erro no envio de bloco de upload", e);
            break; // Para o laço se o servidor falhar
        }
    }
    
    // Para a animação do gráfico ao finalizar tudo
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
}

// --- GATILHO DO BOTÃO ---
startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Testando...";
    
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    await runPingTest();
    await runDownloadTest();
    
    // Intervalo de descanso antes do upload para aliviar o Render gratuito
    await new Promise(r => setTimeout(r, 1000)); 
    
    await runUploadTest();

    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
});
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
ctx.imageSmoothingEnabled = true;

let downloadData = [];
let uploadData = [];
let animationFrameId = null;

// --- FUNÇÃO DO GRÁFICO ---
function drawChart() {
    ctx.fillStyle = "#0f172a"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const padding = 40;
    
    // Grade de fundo
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = padding; i < canvas.width - padding; i += 100) {
        ctx.beginPath(); ctx.moveTo(i, padding); ctx.lineTo(i, canvas.height - padding); ctx.stroke();
    }
    for (let i = padding; i < canvas.height - padding; i += 40) {
        ctx.beginPath(); ctx.moveTo(padding, i); ctx.lineTo(canvas.width - padding, i); ctx.stroke();
    }

    const maxVal = Math.max(...downloadData, ...uploadData, 10);

    // Linha de Download (Azul)
    if (downloadData.length > 0) {
        let dlPoints = [...downloadData];
        if (dlPoints.length === 1) dlPoints.push(dlPoints[0]);

        ctx.beginPath();
        for (let i = 0; i < dlPoints.length; i++) {
            const x = (i / (dlPoints.length - 1)) * (canvas.width - padding * 2) + padding;
            const y = canvas.height - ((dlPoints[i] / maxVal) * (canvas.height - padding * 2) + padding);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#00f0ff"; 
        ctx.lineWidth = 4;
        ctx.stroke();

        let dlGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        dlGradient.addColorStop(0, "rgba(0, 240, 255, 0.12)");
        dlGradient.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.lineTo((canvas.width - padding), canvas.height - padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.fillStyle = dlGradient;
        ctx.fill();
    }

    // Linha de Upload (Rosa)
    if (uploadData.length > 0) {
        let ulPoints = [...uploadData];
        if (ulPoints.length === 1) ulPoints.push(ulPoints[0]);

        ctx.beginPath();
        for (let i = 0; i < ulPoints.length; i++) {
            const x = (i / (ulPoints.length - 1)) * (canvas.width - padding * 2) + padding;
            const y = canvas.height - ((ulPoints[i] / maxVal) * (canvas.height - padding * 2) + padding);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#ff007f"; 
        ctx.lineWidth = 4;
        ctx.stroke();

        let ulGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        ulGradient.addColorStop(0, "rgba(255, 0, 127, 0.12)");
        ulGradient.addColorStop(1, "rgba(255, 0, 127, 0)");
        ctx.lineTo((canvas.width - padding), canvas.height - padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.fillStyle = ulGradient;
        ctx.fill();
    }

    animationFrameId = requestAnimationFrame(drawChart);
}

// --- TESTE DE PING ---
async function runPingTest() {
    let pings = [];
    for (let i = 0; i < 5; i++) {
        const start = performance.now();
        try {
            await fetch(`${API}/ping`, { cache: 'no-store' });
            pings.push(performance.now() - start);
        } catch (e) { console.error(e); }
        await new Promise(r => setTimeout(r, 150));
    }
    const ping = pings.reduce((a, b) => a + b, 0) / pings.length;
    let jitter = 0;
    for (let i = 1; i < pings.length; i++) jitter += Math.abs(pings[i] - pings[i - 1]);
    jitter = jitter / (pings.length - 1);

    pingEl.innerText = `${ping.toFixed(1)} ms`;
    jitterEl.innerText = `${jitter.toFixed(1)} ms`;
}

// --- TESTE DE DOWNLOAD ---
async function runDownloadTest() {
    downloadData = [];
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
                downloadData.push(currentMbps);
            }
        }
    } catch (e) { console.error(e); }
}

// --- TESTE DE UPLOAD ACELERADO (PARALELO MULTI-STREAM) ---
async function runUploadTest() {
    uploadData = [];
    const blobSize = 1 * 1024 * 1024; // 1MB
    const blobData = new Blob([new Uint8Array(blobSize)]);
    
    let totalBytesUploaded = 0;
    const testDuration = 5000; // 5 segundos de teste
    const startTime = performance.now();

    // Função interna para disparar envios concorrentes
    async function uploadWorker() {
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

                // Atualiza o display e a linha rosa em tempo real
                speedEl.innerText = currentMbps.toFixed(2);
                uploadEl.innerText = `${currentMbps.toFixed(2)} Mbps`;
                uploadData.push(currentMbps);

            } catch (e) {
                console.error(e);
                break;
            }
        }
    }

    // Dispara 3 conexões simultâneas para vencer a barreira da latência internacional
    await Promise.all([uploadWorker(), uploadWorker(), uploadWorker()]);
}

// --- CONTROLE PRINCIPAL DE ANIMAÇÃO ---
startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Testando...";
    
    downloadData = [];
    uploadData = [];
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    // 1. Roda o Ping
    await runPingTest();
    
    // 2. Roda o Download
    await runDownloadTest();
    
    // 🧠 SUA VIZAÇÃO: Limpa o painel central e dá uma pausa de 1.2s antes do upload
    speedEl.innerText = "0.00";
    startBtn.innerText = "Preparando Upload...";
    await new Promise(r => setTimeout(r, 1200)); 
    
    // 3. Roda o Upload Acelerado
    startBtn.innerText = "Testando Upload...";
    await runUploadTest();

    // Finalização limpa
    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
});
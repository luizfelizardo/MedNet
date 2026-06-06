const API = "https://mednet-s41z.onrender.com";
const speedEl = document.getElementById("speed");
const pingEl = document.getElementById("ping");
const jitterEl = document.getElementById("jitter");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const startBtn = document.getElementById("startBtn");

const overlay = document.getElementById("resultOverlay");
const closeOverlayBtn = document.getElementById("closeOverlayBtn");

const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 250;
ctx.imageSmoothingEnabled = true;

let downloadData = [];
let uploadData = [];
let animationFrameId = null;

// --- FUNÇÃO DO GRÁFICO DUAL-LINE ---
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

// --- TESTE DE UPLOAD PARALELO SUAVIZADO ---
async function runUploadTest() {
    uploadData = [];
    const blobSize = 1 * 1024 * 1024; 
    const blobData = new Blob([new Uint8Array(blobSize)]);
    
    let totalBytesUploaded = 0;
    const testDuration = 5000; 
    const startTime = performance.now();
    
    // Histórico para calcular a média móvel (Suavização de linha)
    let smoothHistory = [];
    const maxHistorySamples = 8; 

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
                const rawMbps = ((totalBytesUploaded * 8) / 1000000) / totalDuration;

                // Armazena no histórico para amortecer oscilações bruscas
                smoothHistory.push(rawMbps);
                if (smoothHistory.length > maxHistorySamples) smoothHistory.shift();

                // Calcula a média móvel atualizada
                const smoothMbps = smoothHistory.reduce((a, b) => a + b, 0) / smoothHistory.length;

                // Atualiza a tela e o gráfico com os dados fluidos
                speedEl.innerText = smoothMbps.toFixed(2);
                uploadEl.innerText = `${smoothMbps.toFixed(2)} Mbps`;
                uploadData.push(smoothMbps);

            } catch (e) {
                console.error(e);
                break;
            }
        }
    }

    await Promise.all([uploadWorker(), uploadWorker(), uploadWorker()]);
}

// --- GATILHO PRINCIPAL (COM TRANSIÇÃO ESTILOSA) ---
startBtn.addEventListener("click", async () => {
    overlay.classList.add("hidden"); 

    startBtn.disabled = true;
    startBtn.innerText = "Aguardando Ping...";
    
    downloadData = [];
    uploadData = [];
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    // 1. Executa o teste de Latência
    await runPingTest();
    
    // 2. Executa o teste de Download
    startBtn.innerText = "Testando Download...";
    await runDownloadTest();
    
    // 🧠 TRANSIÇÃO BACANA: Zera o medidor e faz contagem regressiva animada no botão
    speedEl.innerText = "0.00";
    
    startBtn.innerText = "Próximo teste em 3...";
    await new Promise(r => setTimeout(r, 500));
    
    startBtn.innerText = "Próximo teste em 2...";
    await new Promise(r => setTimeout(r, 500));
    
    startBtn.innerText = "Próximo teste em 1...";
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Executa o teste de Upload Suavizado
    startBtn.innerText = "Testando Upload...";
    await runUploadTest();

    // Consolida resultados finais na tela sobreposta
    document.getElementById("resDownload").innerText = downloadEl.innerText;
    document.getElementById("resUpload").innerText = uploadEl.innerText;
    document.getElementById("resPing").innerText = pingEl.innerText;
    document.getElementById("resJitter").innerText = jitterEl.innerText;
    
    overlay.classList.remove("hidden");

    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
});

// Reset do Painel
closeOverlayBtn.addEventListener("click", () => {
    overlay.classList.add("hidden");
    speedEl.innerText = "0.00";
    pingEl.innerText = "--";
    jitterEl.innerText = "--";
    downloadEl.innerText = "--";
    uploadEl.innerText = "--";
    
    ctx.fillStyle = "#0f172a"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});
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

// --- AGORA TEMOS DOIS ARRAYS INDEPENDENTES ---
let downloadData = [];
let uploadData = [];
let animationFrameId = null;

// --- FUNÇÃO DO GRÁFICO COM DUAS LÍNHAS NEON ---
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

    // Encontra o maior valor global para manter a escala correta do gráfico
    const maxVal = Math.max(...downloadData, ...uploadData, 10);

    // --- 1. DESENHAR LINHA DE DOWNLOAD (AZUL CIANO) ---
    if (downloadData.length > 0) {
        let dlPoints = [...downloadData];
        if (dlPoints.length === 1) dlPoints.push(dlPoints[0]);

        // Linha do Download
        ctx.beginPath();
        for (let i = 0; i < dlPoints.length; i++) {
            const x = (i / (dlPoints.length - 1)) * (canvas.width - padding * 2) + padding;
            const y = canvas.height - ((dlPoints[i] / maxVal) * (canvas.height - padding * 2) + padding);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#00f0ff"; 
        ctx.lineWidth = 4;
        ctx.stroke();

        // Gradiente do Download
        let dlGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        dlGradient.addColorStop(0, "rgba(0, 240, 255, 0.15)");
        dlGradient.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.lineTo((canvas.width - padding), canvas.height - padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.fillStyle = dlGradient;
        ctx.fill();
    }

    // --- 2. DESENHAR LINHA DE UPLOAD (ROSA/MAGENTA NEON) ---
    if (uploadData.length > 0) {
        let ulPoints = [...uploadData];
        if (ulPoints.length === 1) ulPoints.push(ulPoints[0]);

        // Linha do Upload
        ctx.beginPath();
        for (let i = 0; i < ulPoints.length; i++) {
            const x = (i / (ulPoints.length - 1)) * (canvas.width - padding * 2) + padding;
            const y = canvas.height - ((ulPoints[i] / maxVal) * (canvas.height - padding * 2) + padding);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#ff007f"; // Rosa choque/Magenta neon super contrastante
        ctx.lineWidth = 4;
        ctx.stroke();

        // Gradiente do Upload
        let ulGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        ulGradient.addColorStop(0, "rgba(255, 0, 127, 0.15)");
        ulGradient.addColorStop(1, "rgba(255, 0, 127, 0)");
        ctx.lineTo((canvas.width - padding), canvas.height - padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.fillStyle = ulGradient;
        ctx.fill();
    }

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
        } catch (e) { console.error(e); }
        await new Promise(r => setTimeout(r, 200));
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
    downloadData = []; // Limpa apenas o download
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
                downloadData.push(currentMbps); // Alimenta a linha azul
            }
        }
    } catch (e) { console.error(e); }
}

// --- TESTE DE UPLOAD ---
async function runUploadTest() {
    uploadData = []; // Limpa apenas o upload para começar do zero no gráfico
    
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
            uploadData.push(currentMbps); // Alimenta a linha rosa ao vivo!

        } catch (e) {
            console.error(e);
            break; 
        }
    }
}

// --- GATILHO DO BOTÃO ---
startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    startBtn.innerText = "Testando...";
    
    downloadData = [];
    uploadData = [];
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    await runPingTest();
    await runDownloadTest();
    
    await new Promise(r => setTimeout(r, 800)); 
    
    await runUploadTest();

    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
});
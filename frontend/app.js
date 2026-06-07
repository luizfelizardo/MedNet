const API = "https://mednet-s41z.onrender.com";
const speedEl = document.getElementById("speed");
const pingEl = document.getElementById("ping");
const jitterEl = document.getElementById("jitter");
const downloadEl = document.getElementById("download");
const uploadEl = document.getElementById("upload");
const startBtn = document.getElementById("startBtn");

const ispNameEl = document.getElementById("ispName");
const ipAddressEl = document.getElementById("ipAddress");

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

// Variáveis de controle do motor de fluidez (LERP)
let targetSpeed = 0;   // Velocidade real vinda da rede
let currentSpeed = 0;  // Velocidade suavizada sendo exibida na tela
let isTesting = false;
let activeTestType = null; // 'download' ou 'upload'
let tickerIntervalId = null;

// --- MOTOR DE SUAVIZAÇÃO EM TEMPO REAL (60 FPS) ---
function startInterpolationTicker() {
    if (tickerIntervalId) clearInterval(tickerIntervalId);
    
    // Roda a cada 16ms (Equivalente a 60 frames por segundo)
    tickerIntervalId = setInterval(() => {
        if (!isTesting) return;

        // Fator de suavização (0.1 = Ultra fluido/Deslize suave, 0.3 = Mais responsivo)
        const interpolationFactor = 0.12; 
        
        // Aplicação matemática do LERP: De forma suave, aproxima a velocidade atual da real
        currentSpeed += (targetSpeed - currentSpeed) * interpolationFactor;
        
        // Evita flutuações residuais perto de zero
        if (currentSpeed < 0.05 && targetSpeed === 0) currentSpeed = 0;

        // Atualiza o painel central com fluidez de milissegundos
        speedEl.innerText = currentSpeed.toFixed(2);

        // Alimenta o array do gráfico com a velocidade perfeitamente suavizada
        if (activeTestType === "download") {
            downloadData.push(currentSpeed);
        } else if (activeTestType === "upload") {
            uploadData.push(currentSpeed);
        }
    }, 16);
}

function stopInterpolationTicker() {
    if (tickerIntervalId) {
        clearInterval(tickerIntervalId);
        tickerIntervalId = null;
    }
    targetSpeed = 0;
    currentSpeed = 0;
}

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

    // Linha de Download (Azul Ciano)
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

    // Linha de Upload (Rosa Magenta)
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

// --- FUNÇÃO PARA DETECTAR OPERADORA E IP ---
async function fetchProviderInfo() {
    try {
        ispNameEl.innerText = "Identificando rede...";
        
        // Chamada para API pública de Geolocalização por IP
        const response = await fetch("http://ip-api.com/json/?fields=status,org,as,query,city");
        const data = await response.json();
        
        if (data.status === "success") {
            // Limpa o nome da operadora (remove códigos de ASN se houver)
            const provider = data.org || data.as || "Provedor Desconhecido";
            const city = data.city || "";
            
            const fullLocation = city ? `${provider} (${city})` : provider;
            
            ispNameEl.innerText = fullLocation;
            ipAddressEl.innerText = data.query;
        } else {
            ispNameEl.innerText = "Internet Local";
        }
    } catch (e) {
        console.error("Erro ao buscar provedor:", e);
        ispNameEl.innerText = "Conexão Ativa";
    }
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

// --- TESTE DE DOWNLOAD OTIMIZADO ---
async function runDownloadTest() {
    downloadData = [];
    activeTestType = "download";
    isTesting = true;
    
    startInterpolationTicker();
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
                // Modifica apenas o alvo real de velocidade (O Ticker suaviza o resto a 60 FPS)
                targetSpeed = ((loadedBytes * 8) / 1000000) / duration;
                downloadEl.innerText = `${targetSpeed.toFixed(2)} Mbps`;
            }
        }
    } catch (e) { console.error(e); }
    
    isTesting = false;
    stopInterpolationTicker();
}

// --- TESTE DE UPLOAD MULTI-STREAM OTIMIZADO ---
async function runUploadTest() {
    uploadData = [];
    activeTestType = "upload";
    isTesting = true;
    
    startInterpolationTicker();
    
    const blobSize = 1 * 1024 * 1024; 
    const blobData = new Blob([new Uint8Array(blobSize)]);
    
    let totalBytesUploaded = 0;
    const testDuration = 5000; 
    const startTime = performance.now();

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
                
                // Modifica apenas o alvo real de velocidade (O Ticker suaviza a 60 FPS)
                targetSpeed = ((totalBytesUploaded * 8) / 1000000) / totalDuration;
                uploadEl.innerText = `${targetSpeed.toFixed(2)} Mbps`;

            } catch (e) {
                console.error(e);
                break;
            }
        }
    }

    await Promise.all([uploadWorker(), uploadWorker(), uploadWorker()]);
    
    isTesting = false;
    stopInterpolationTicker();
}

// --- GATILHO PRINCIPAL COM CONTAGEM REGRESSIVA VISUAL ---
startBtn.addEventListener("click", async () => {
    overlay.classList.add("hidden"); 

    startBtn.disabled = true;
    startBtn.innerText = "Aguardando Ping...";
    
    downloadData = [];
    uploadData = [];
    uploadEl.innerText = "--";
    downloadEl.innerText = "--";
    speedEl.innerText = "0.00";

    fetchProviderInfo();

    await runPingTest();
    
    startBtn.innerText = "Testando Download...";
    await runDownloadTest();
    
    // Transição fluida e elegante pós-download
    speedEl.innerText = "0.00";
    startBtn.innerText = "Próximo teste em 3...";
    await new Promise(r => setTimeout(r, 500));
    startBtn.innerText = "Próximo teste em 2...";
    await new Promise(r => setTimeout(r, 500));
    startBtn.innerText = "Próximo teste em 1...";
    await new Promise(r => setTimeout(r, 500));
    
    startBtn.innerText = "Testando Upload...";
    await runUploadTest();

    // Fixa os valores coletados no overlay final
    document.getElementById("resDownload").innerText = downloadEl.innerText;
    document.getElementById("resUpload").innerText = uploadEl.innerText;
    document.getElementById("resPing").innerText = pingEl.innerText;
    document.getElementById("resJitter").innerText = jitterEl.innerText;
    document.getElementById("resISP").innerText = ispNameEl.innerText;
    
    overlay.classList.remove("hidden");

    startBtn.disabled = false;
    startBtn.innerText = "Iniciar Teste";
    
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
});

// Reset do Sistema
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
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

function drawChart(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 3;

    ctx.beginPath();

    chartData.forEach((v,i)=>{

        const x =
        (i/(chartData.length-1||1))
        * canvas.width;

        const y =
        canvas.height
        -
        (Math.min(v,1000)/1000)
        * canvas.height;

        if(i===0)
            ctx.moveTo(x,y);
        else
            ctx.lineTo(x,y);

    });

    ctx.stroke();
}

async function getPing(){

    const samples=[];

    for(let i=0;i<8;i++){

        const start =
        performance.now();

        await fetch(
            API+"/ping?"+Date.now()
        );

        samples.push(
            performance.now()-start
        );
    }

    return samples;
}

function getJitter(samples){

    let total = 0;

    for(let i=1;i<samples.length;i++){

        total += Math.abs(
            samples[i]
            -
            samples[i-1]
        );
    }

    return total/(samples.length-1);
}

async function testDownload(){

    chartData=[];

    const start =
    performance.now();

    const response =
    await fetch(
        API+"/download?"+Date.now()
    );

    const reader =
    response.body.getReader();

    let bytes = 0;

    while(true){

        const {
            done,
            value
        } = await reader.read();

        if(done) break;

        bytes += value.length;

        const elapsed =
        (performance.now()-start)
        /1000;

        const mbps =
        ((bytes*8)/elapsed)
        /1000000;

        speedEl.innerText =
        mbps.toFixed(2);

        chartData.push(mbps);

        if(chartData.length>60){
            chartData.shift();
        }

        drawChart();
    }

    return (
        (bytes*8)
        /
        ((performance.now()-start)/1000)
        /
        1000000
    );
}

async function testUpload(){
    // Cria o array de 10MB preenchido com zeros (mais rápido e seguro)
    const data = new Uint8Array(10 * 1024 * 1024);
    
    // Opcional: Se quiser preencher com dados variados sem estourar o limite:
    for (let i = 0; i < data.length; i += 65536) {
        const chunk = data.subarray(i, Math.min(i + 65536, data.length));
        crypto.getRandomValues(chunk);
    }

    const start = performance.now();

    await fetch(
        API + "/upload",
        {
            method: "POST",
            body: data
        }
    );

    return (
        (data.length * 8) /
        ((performance.now() - start) / 1000) /
        1000000
    );
}

startBtn.addEventListener(
"click",
async()=>{

    startBtn.disabled=true;

    speedEl.innerText="0";

    const pings =
    await getPing();

    const ping =
    pings.reduce((a,b)=>a+b,0)
    / pings.length;

    const jitter =
    getJitter(pings);

    pingEl.innerText =
    ping.toFixed(1)+" ms";

    jitterEl.innerText =
    jitter.toFixed(1)+" ms";

    const download =
    await testDownload();

    downloadEl.innerText =
    download.toFixed(2)
    +" Mbps";

    const upload =
    await testUpload();

    uploadEl.innerText =
    upload.toFixed(2)
    +" Mbps";

    speedEl.innerText =
    download.toFixed(2);

    startBtn.disabled=false;

});
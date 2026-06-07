# 🚀 MedNET 

O **MedNET Deluxe** é um medidor de velocidade de internet (Speedtest) moderno, de alta fidelidade e performance. O projeto foi desenvolvido com uma arquitetura desacoplada (Full-Stack), contando com um motor gráfico de alta fluidez alimentado a 60 FPS e um backend estruturado para testes dinâmicos de vazão de rede.

Hospedado oficialmente em: https://speedmednet.netlify.app/
---

## 🛠️ Tecnologias Utilizadas

### Frontend:
* **HTML5 & CSS3:** Estrutura semântica e estilização moderna com design responsivo (adaptável para computadores, tablets e celulares).
* **JavaScript (Vanilla ES6):** Lógica assíncrona, manipulação do DOM e consumo de APIs.
* **HTML5 Canvas API:** Renderização do gráfico dual-line em tempo real.

### Backend:
* **Node.js & Express:** Servidor de alta performance para gerenciamento de endpoints de rede.
* **CORS Configuration:** Controle avançado de políticas de compartilhamento de recursos de origens cruzadas.

---

## 🎯 Funcionalidades & Engenharia do Projeto

* **Motor de Suavização LERP (60 FPS):** Implementação matemática de Interpolação Linear (*Linear Interpolation*) aplicada no fluxo de renderização. O indicador numérico e as curvas do gráfico se movem de forma contínua e suave, eliminando os "saltos" clássicos causados por oscilações na oscilação da rede.
* **Upload Inteligente Multi-Stream:** Para furar barreiras de latência internacional e limitações de servidores em nuvem, o upload dispara **3 requisições assíncronas concorrentes (paralelas)** enviando pequenos blocos de dados de 1MB por vez, garantindo precisão e medições mais altas.
* **Gráfico Dinâmico Dual-Line:** Gráfico customizado com grade estilo osciloscópio que exibe simultaneamente as curvas de performance do **Download (Azul Ciano)** e do **Upload (Rosa Magenta)** com efeito gradiente de preenchimento.
* **Identificação de ISP Baseada no Servidor:** Consulta segura baseada em HTTPS onde o próprio backend identifica o Provedor de Internet (*ISP*), a cidade de origem e o endereço de IP do visitante, protegendo o frontend contra erros de *Mixed Content*.
* **Veredicto Inteligente de Conexão:** Ao final de cada teste, o sistema analisa a velocidade registrada e gera uma notificação visual estilizada (verde, amarela ou vermelha) com base na regra de negócio da qualidade da internet do usuário.
* **Interface Glassmorphic Overlay:** Janela flutuante de encerramento do teste com efeitos de desfoque de fundo (*backdrop-filter*) inspirada nas melhores aplicações de mercado do setor.

---

## 📁 Estrutura do Repositório


MedNET/
├── backend/
│   ├── testfiles/
│   │   └── 100mb.bin       # Arquivo binário pesado gerado para teste de download
│   ├── node_modules/
│   ├── package.json
│   └── server.js           # API Express (Ping, Download, Upload e ISP)
├── frontend/
│   ├── app.js              # Lógica do ticker de animação, LERP e requisições
│   ├── index.html          # Layout estrutural e viewport do Canvas
│   └── style.css           # Estilização completa e regras de media-queries
└── README.md

🚀 Como Executar o Projeto Localmente
Pré-requisitos:
Ter o Node.js instalado na sua máquina.

1. Configurando o Backend
Entre na pasta do servidor, instale as dependências e inicie:

Bash
cd backend
npm install
node server.js
O servidor estará rodando localmente em http://localhost:3000.

2. Configurando o Frontend
Abra o arquivo frontend/app.js e altere a constante API do topo para apontar para o seu servidor local:

JavaScript
const API = "http://localhost:3000";
Abra o arquivo frontend/index.html diretamente no seu navegador ou use a extensão Live Server do VS Code.

---

### 📥 Atualizando pro Repositório Final

Abra o seu terminal na pasta raiz (`MedNET$`), crie ou atualize o arquivo e mande bala:

bash
git add .
git commit -m "Docs: Adicionado README profissional detalhando funcionalidades técnicas"
git push origin main

📝 Licença
Este projeto é focado em estudos de desenvolvimento full-stack, APIs de rede e performance gráfica. Sinta-se à vontade para clonar, sugerir melhorias ou utilizá-lo como portfólio!

Desenvolvido com 🚀 por Luiz Eduardo Felizardo.

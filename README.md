
<img src="./frontend/public/foxican-logo.png" alt="FOXICAN AI Logo" width="65">

<h1>FOXICAN AI</h1>

<h3>CREATE BEYOND IMAGINATION</h3>

<p><strong>AI-Powered Image &amp; Video Generation Platform</strong></p>

<p>
  Transform your imagination into stunning visual experiences with
  AI-powered image generation and cinematic video creation.
</p>

<p>
  <img src="https://img.shields.io/badge/React-TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Cloudflare-FLUX-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare">
  <img src="https://img.shields.io/badge/JSON2Video-Rendering-805AD5?style=for-the-badge" alt="JSON2Video">
</p>

<p><strong>IMAGE GENERATION | VIDEO CREATION | CREATIVE AI</strong></p>

<hr>

<h2>01. About FOXICAN AI</h2>

<p>
  <strong>FOXICAN AI</strong> is an AI-powered creative platform designed
  to transform text prompts into visually engaging images and
  cinematic-style videos.
</p>

<p>
  Built using modern web technologies, FOXICAN AI combines Cloudflare
  FLUX for AI image generation with JSON2Video for automated video rendering.
  The platform brings visual creativity into a unified workspace with a
  simple, intuitive, and modern interface.
</p>

<h2>02. Key Features</h2>

<h3>AI Image Generation</h3>
<ul>
  <li>Generate images directly from text prompts.</li>
  <li>Powered by Cloudflare FLUX.</li>
  <li>Multiple aspect ratio options.</li>
  <li>Image preview and download.</li>
  <li>Prompt-based image creation.</li>
</ul>

<h3>AI Video Creation</h3>
<ul>
  <li>Create cinematic-style videos from text prompts.</li>
  <li>Automatic creation of multiple scene-specific prompts.</li>
  <li>AI-generated scene images.</li>
  <li>Automated video rendering through JSON2Video.</li>
  <li>Video preview and download.</li>
</ul>

<h3>Creative Workspace</h3>
<ul>
  <li>Image and video generation modes.</li>
  <li>Modern dark-themed interface.</li>
  <li>Dark and light theme switching.</li>
  <li>Prompt management and reuse.</li>
  <li>Generation history.</li>
  <li>Persistent browser-based history.</li>
  <li>Delete individual history entries.</li>
  <li>Responsive user interface.</li>
</ul>

<h2>03. Technology Stack</h2>

<table>
  <thead>
    <tr>
      <th>Category</th>
      <th>Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Frontend</td><td>React</td></tr>
    <tr><td>Programming Language</td><td>TypeScript</td></tr>
    <tr><td>Build Tool</td><td>Vite</td></tr>
    <tr><td>Backend</td><td>Python</td></tr>
    <tr><td>API Framework</td><td>FastAPI</td></tr>
    <tr><td>Image Generation</td><td>Cloudflare FLUX</td></tr>
    <tr><td>Video Rendering</td><td>JSON2Video API</td></tr>
    <tr><td>HTTP Client</td><td>HTTPX</td></tr>
    <tr><td>Data Validation</td><td>Pydantic</td></tr>
    <tr><td>Environment Management</td><td>Python Dotenv</td></tr>
  </tbody>
</table>

<h2>04. System Architecture</h2>

<pre>
USER
 |
 v
FOXICAN AI FRONTEND
React + TypeScript
 |
 v
FASTAPI BACKEND
 |
 +-------------------+
 |                   |
 v                   v
CLOUDFLARE AI       JSON2VIDEO
FLUX MODEL           API
 |                   |
 v                   v
AI SCENE IMAGES     VIDEO RENDERING
 |                   |
 +---------+---------+
           |
           v
      FINAL OUTPUT
       IMAGE / VIDEO
           |
           v
    PREVIEW & DOWNLOAD
</pre>

<h2>05. Project Structure</h2>

<pre>
FOXICAN-AI/
|
|-- frontend/
|   |-- public/
|   |   |-- foxican-logo.png
|   |
|   |-- src/
|   |   |-- App.tsx
|   |   |-- App.css
|   |   |-- ...
|   |
|   |-- package.json
|   |-- package-lock.json
|   |-- index.html
|   |-- vite.config.ts
|
|-- backend/
|   |-- main.py
|   |-- requirements.txt
|   |-- .env.example
|   |-- .env
|
|-- .gitignore
|-- README.md
</pre>

<h2>06. How FOXICAN AI Works</h2>

<h3>Image Generation Workflow</h3>
<ol>
  <li>The user enters a text prompt.</li>
  <li>The frontend sends the request to the FastAPI backend.</li>
  <li>The backend validates the prompt.</li>
  <li>Cloudflare FLUX processes the image-generation request.</li>
  <li>The generated image is returned to the frontend.</li>
  <li>The user can preview and download the image.</li>
</ol>

<h3>Video Generation Workflow</h3>
<ol>
  <li>The user enters a video prompt.</li>
  <li>The backend creates six scene-specific prompts.</li>
  <li>Cloudflare FLUX generates individual scene images.</li>
  <li>The generated images are uploaded to JSON2Video.</li>
  <li>JSON2Video combines the scene images into a rendered video.</li>
  <li>The completed video is returned to the frontend.</li>
  <li>The user can preview and download the video.</li>
</ol>

<p>
  <strong>Implementation Note:</strong>
  The current video-generation workflow combines AI-generated scene images
  into a cinematic slideshow. It does not currently generate continuous
  AI video footage.
</p>

<hr>

<h2>07. Installation and Setup</h2>

<h3>Prerequisites</h3>
<ul>
  <li>Python</li>
  <li>Node.js</li>
  <li>npm</li>
  <li>Git</li>
  <li>Cloudflare AI API credentials</li>
  <li>JSON2Video API key</li>
</ul>

<h3>Step 1: Clone the Repository</h3>

<pre><code>git clone https://github.com/YOUR-USERNAME/FOXICAN-AI.git
cd FOXICAN-AI</code></pre>

<h3>Step 2: Backend Setup</h3>

<pre><code>cd backend
python -m pip install -r requirements.txt</code></pre>

<h3>Step 3: Configure Environment Variables</h3>

<p>Create a <code>.env</code> file inside the backend directory.</p>

<pre><code>CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
JSON2VIDEO_API_KEY=your_json2video_api_key</code></pre>

<p>
  Replace the placeholder values with your actual API credentials.
  Never upload your real <code>.env</code> file or API credentials to GitHub.
</p>

<h3>Step 4: Run the Backend</h3>

<pre><code>python -m uvicorn main:app --reload --port 8000</code></pre>

<p><strong>Backend URL:</strong></p>
<pre>http://127.0.0.1:8000</pre>

<p><strong>Interactive API Documentation:</strong></p>
<pre>http://127.0.0.1:8000/docs</pre>

<h3>Step 5: Frontend Setup</h3>

<p>Open a separate terminal.</p>

<pre><code>cd frontend
npm install
npm run dev</code></pre>

<p>
  Open the local URL displayed in your terminal.
</p>

<h2>08. API Endpoints</h2>

<table>
  <thead>
    <tr>
      <th>Method</th>
      <th>Endpoint</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>GET</td><td><code>/</code></td><td>API status</td></tr>
    <tr><td>GET</td><td><code>/api/health</code></td><td>Backend health check</td></tr>
    <tr><td>POST</td><td><code>/api/generate-image</code></td><td>Generate an AI image</td></tr>
    <tr><td>POST</td><td><code>/api/generate-video</code></td><td>Generate a video</td></tr>
  </tbody>
</table>

<h3>API Documentation</h3>
<p>
  FastAPI provides interactive API documentation through Swagger UI.
</p>

<pre>http://127.0.0.1:8000/docs</pre>

<h2>09. Environment Variables</h2>

<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>CLOUDFLARE_ACCOUNT_ID</code></td>
      <td>Cloudflare account identifier</td>
    </tr>
    <tr>
      <td><code>CLOUDFLARE_API_TOKEN</code></td>
      <td>Cloudflare API authentication token</td>
    </tr>
    <tr>
      <td><code>JSON2VIDEO_API_KEY</code></td>
      <td>JSON2Video API authentication key</td>
    </tr>
  </tbody>
</table>

<p>
  All credentials must remain on the backend and should never be exposed
  in frontend code.
</p>

<h2>10. Current Implementation Status</h2>

<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>React + TypeScript Frontend</td><td>Implemented</td></tr>
    <tr><td>FastAPI Backend</td><td>Implemented</td></tr>
    <tr><td>AI Image Generation</td><td>Integrated</td></tr>
    <tr><td>Video Rendering Integration</td><td>Integrated</td></tr>
    <tr><td>Image Preview</td><td>Implemented</td></tr>
    <tr><td>Video Preview</td><td>Implemented</td></tr>
    <tr><td>Download Functionality</td><td>Implemented</td></tr>
    <tr><td>Generation History</td><td>Implemented</td></tr>
    <tr><td>Browser History Persistence</td><td>Implemented</td></tr>
    <tr><td>Dark / Light Theme</td><td>Implemented</td></tr>
  </tbody>
</table>

<h2>11. Future Enhancements</h2>

<ul>
  <li>User authentication and account management.</li>
  <li>PostgreSQL database integration.</li>
  <li>Cloud-based generation history.</li>
  <li>Secure user credit management.</li>
  <li>Additional AI image-generation models.</li>
  <li>Advanced AI video-generation capabilities.</li>
  <li>Generation queue and status tracking.</li>
  <li>Advanced creative editing tools.</li>
  <li>Usage analytics and monitoring.</li>
  <li>Scalable cloud deployment.</li>
</ul>

<h2>12. Security</h2>

<ul>
  <li>API credentials are stored in backend environment variables.</li>
  <li>Sensitive configuration files are excluded from version control.</li>
  <li>Provider API requests are handled through the backend.</li>
  <li>API keys are not intended to be exposed to frontend users.</li>
</ul>

<h2>13. License</h2>

<p>
  This project is currently under development. A formal open-source
  license can be added when the licensing terms are finalized.
</p>

<hr>

<img src="./frontend/public/foxican-logo.png" alt="FOXICAN AI Logo" width="45">

<h3>FOXICAN AI</h3>

<p><strong>CREATE BEYOND IMAGINATION</strong></p>

<p>Developed by <strong>Nandhini Sri</strong></p>

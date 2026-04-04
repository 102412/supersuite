const passwordInput = document.getElementById('demo-pass');
const unlockBtn = document.getElementById('unlock-btn');
const passwordScreen = document.getElementById('password-screen');
const builderScreen = document.getElementById('builder-screen');

const sitePreview = document.getElementById('site-preview');

const demoPassword = 'SS26';

unlockBtn.onclick = () => {
  if (passwordInput.value === demoPassword) {
    passwordScreen.style.display = 'none';
    builderScreen.style.display = 'block';
  } else {
    document.getElementById('pass-error').style.display = 'block';
  }
};

let currentTemplate = 'glass';
let blocks = [];

function setTemplate(template) {
  currentTemplate = template;
  updatePreview();
}

function addBlock(type) {
  blocks.push({ type, content: `Editable ${type}` });
  updatePreview();
}

function updatePreview() {
  let html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Generated Site</title>';

  if(currentTemplate==='glass'){
    html += `<style>body{background:#111;color:white;font-family:sans-serif;}section{backdrop-filter:blur(15px);background:rgba(255,255,255,0.1);padding:20px;margin:20px;border-radius:10px;} h1{color:orange;}</style>`;
  } else if(currentTemplate==='classy'){
    html += `<style>body{background:white;color:#222;font-family:serif;}h1{color:#222;} section{padding:30px;margin:20px;border-bottom:2px solid #ccc;}</style>`;
  } else {
    html += `<style>body{background:#222;color:white;font-family:sans-serif;} section{padding:20px;margin:20px;}</style>`;
  }

  html += '</head><body>';

  blocks.forEach(block=>{
    if(block.type==='hero') html += `<section><h1 contenteditable='true'>${block.content}</h1></section>`;
    if(block.type==='lead') html += `<section><form><input placeholder='Name'><input placeholder='Email'><button>Submit</button></form></section>`;
    if(block.type==='testimonials') html += `<section><p>"Customer testimonial here"</p></section>`;
    if(block.type==='services') html += `<section><ul><li>Service 1</li><li>Service 2</li></ul></section>`;
    if(block.type==='cta') html += `<section><button>Call To Action</button></section>`;
  });

  html += '</body></html>';

  sitePreview.srcdoc = html;
}

document.getElementById('generate-btn').onclick = () => {
  const htmlBlob = new Blob([sitePreview.srcdoc], {type:'text/html'});
  const cssBlob = new Blob([`/* Custom CSS can go here */`], {type:'text/css'});
  const jsBlob = new Blob([`/* Custom JS can go here */`], {type:'text/javascript'});

  const aHTML = document.createElement('a');
  aHTML.href = URL.createObjectURL(htmlBlob);
  aHTML.download = 'index.html';
  aHTML.click();

  const aCSS = document.createElement('a');
  aCSS.href = URL.createObjectURL(cssBlob);
  aCSS.download = 'style.css';
  aCSS.click();

  const aJS = document.createElement('a');
  aJS.href = URL.createObjectURL(jsBlob);
  aJS.download = 'script.js';
  aJS.click();
};

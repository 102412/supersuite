const passwordInput = document.getElementById('demo-pass');
const unlockBtn = document.getElementById('unlock-btn');
const passwordScreen = document.getElementById('password-screen');
const builderScreen = document.getElementById('builder-screen');
const sitePreview = document.getElementById('site-preview');

const demoPassword = 'SS26';

let currentTemplate = 'glass';
let selectedFont = 'Roboto';
let selectedElement = null;
let blocks = [];

unlockBtn.onclick = () => {
  if (passwordInput.value === demoPassword) {
    passwordScreen.style.display = 'none';
    builderScreen.style.display = 'block';
  } else {
    document.getElementById('pass-error').style.display = 'block';
  }
};

function setTemplate(template) {
  currentTemplate = template;
  updatePreview();
}

function updateSelectedFont(font) {
  selectedFont = font;
  if (selectedElement) {
    selectedElement.style.fontFamily = font;
  }
}

function updateSelectedStyle(styleProp, value) {
  if (selectedElement) {
    selectedElement.style[styleProp] = value;
  }
  updatePreview();
}

function addBlock(type) {
  const id = `block-${blocks.length}`;
  const block = { id, type, content: `Editable ${type}`, style: { color: '#fff', fontSize: '24px', fontFamily: selectedFont, backgroundColor: 'transparent' } };
  blocks.push(block);
  updatePreview();
}

function updatePreview() {
  let html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Generated Site</title>';

  html += `<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Montserrat:wght@400;700&display=swap" rel="stylesheet">`;
  html += '</head><body style="margin:0;padding:0;">';

  blocks.forEach(block => {
    html += `<section id='${block.id}' style='color:${block.style.color}; font-size:${block.style.fontSize}; font-family:${block.style.fontFamily}; background-color:${block.style.backgroundColor}; padding:20px; margin:20px; border-radius:12px;'>`;
    if(block.type==='hero') html += `<h1 contenteditable='true'>${block.content}</h1>`;
    if(block.type==='lead') html += `<form><input placeholder='Name'><input placeholder='Email'><button>Submit</button></form>`;
    if(block.type==='testimonials') html += `<p contenteditable='true'>"Customer testimonial here"</p>`;
    if(block.type==='services') html += `<ul><li contenteditable='true'>Service 1</li><li contenteditable='true'>Service 2</li></ul>`;
    if(block.type==='cta') html += `<button contenteditable='true'>Call To Action</button>`;
    html += `</section>`;
  });

  html += '</body></html>';
  sitePreview.srcdoc = html;
}

document.getElementById('generate-btn').onclick = () => {
  const htmlBlob = new Blob([sitePreview.srcdoc], {type:'text/html'});
  const cssBlob = new Blob([`/* User generated CSS can be added here */`], {type:'text/css'});
  const jsBlob = new Blob([`/* User generated JS can be added here */`], {type:'text/javascript'});

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

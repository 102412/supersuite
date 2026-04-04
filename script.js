const passwordInput = document.getElementById('demo-pass');
const unlockBtn = document.getElementById('unlock-btn');
const passwordScreen = document.getElementById('password-screen');
const builderScreen = document.getElementById('builder-screen');
const sitePreview = document.getElementById('site-preview');

const demoPassword = 'SS26';

let currentTemplate = 'glass';
let globalStyles = {
  primaryColor: '#ff7f00',
  secondaryColor: '#ffae42',
  headingFont: 'Roboto',
  bodyFont: 'Roboto',
  buttonStyle: 'rounded'
};

let blocks = [];

unlockBtn.onclick = () => {
  if(passwordInput.value === demoPassword){
    passwordScreen.style.display = 'none';
    builderScreen.style.display = 'block';
    updatePreview();
  } else {
    document.getElementById('pass-error').style.display = 'block';
  }
};

function setTemplate(template){
  currentTemplate = template;
  updatePreview();
}

function updateGlobalStyle(prop, value){
  globalStyles[prop] = value;
  updatePreview();
}

function addBlock(type){
  const id = `block-${blocks.length}`;
  const block = { id, type, content: `Editable ${type}`, style: {} };
  blocks.push(block);
  updatePreview();
}

function updatePreview(){
  let html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Generated Site</title>';
  html += `<link href='https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Montserrat:wght@400;700&family=Open+Sans:wght@400;700&display=swap' rel='stylesheet'>`;
  html += '</head><body style="margin:0;padding:0;font-family:'+globalStyles.bodyFont+';">';

  blocks.forEach(block => {
    if(block.type==='hero') html += `<section class='hero-block' style='font-family:${globalStyles.headingFont};'>` + `<h1 contenteditable='true'>Hero Heading</h1><p contenteditable='true'>Subheading text here</p><button class='btn'>Call To Action</button>` + `</section>`;
    if(block.type==='lead') html += `<section class='lead-block'><form><input placeholder='Name'><input placeholder='Email'><button class='btn'>Submit</button></form></section>`;
    if(block.type==='testimonials') html += `<section class='testimonials-block'><div><p>"Customer testimonial here"</p></div><div><p>"Another testimonial"</p></div></section>`;
    if(block.type==='services') html += `<section class='services-block'><div><h3>Service 1</h3></div><div><h3>Service 2</h3></div></section>`;
    if(block.type==='cta') html += `<section class='cta-block'><h2 contenteditable='true'>Join Now</h2><button class='btn'>Get Started</button></section>`;
  });

  html += '</body></html>';
  sitePreview.srcdoc = html;
}

document.getElementById('generate-btn').onclick = () => {
  const htmlBlob = new Blob([sitePreview.srcdoc], {type:'text/html'});
  const cssBlob = new Blob([`/* User generated CSS */`], {type:'text/css'});
  const jsBlob = new Blob([`/* User generated JS */`], {type:'text/javascript'});

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


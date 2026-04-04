const canvas = document.getElementById("canvas");
let selected = null;

function scrollToBuilder() {
  document.getElementById("builder").scrollIntoView({ behavior: "smooth" });
}

function addElement(type) {
  const el = document.createElement("div");
  el.classList.add("element");

  if (type === "heading") {
    el.innerHTML = `<h3 contenteditable="true">Heading</h3>`;
  }

  if (type === "text") {
    el.innerHTML = `<p contenteditable="true">Editable text...</p>`;
  }

  if (type === "button") {
    el.innerHTML = `<button>Click</button>`;
  }

  el.onclick = () => selectElement(el);

  el.draggable = true;
  el.ondragstart = () => dragged = el;

  canvas.appendChild(el);
}

let dragged = null;

canvas.ondragover = (e) => e.preventDefault();

canvas.ondrop = (e) => {
  e.preventDefault();
  if (dragged) canvas.appendChild(dragged);
};

function selectElement(el) {
  selected = el;
}

document.getElementById("bgColor").oninput = (e) => {
  if (selected) selected.style.background = e.target.value;
};

document.getElementById("textColor").oninput = (e) => {
  if (selected) selected.style.color = e.target.value;
};

document.getElementById("fontSize").oninput = (e) => {
  if (selected) selected.style.fontSize = e.target.value + "px";
};

function saveProject() {
  localStorage.setItem("supersuite", canvas.innerHTML);
  alert("Saved");
}

function loadProject() {
  canvas.innerHTML = localStorage.getItem("supersuite") || "";
  rebindElements();
}

function clearCanvas() {
  canvas.innerHTML = "";
}

function rebindElements() {
  document.querySelectorAll(".element").forEach(el => {
    el.onclick = () => selectElement(el);
    el.draggable = true;
    el.ondragstart = () => dragged = el;
  });
}

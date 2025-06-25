"use strict";

import "./new-document.css";

// Create a new document when the create button is clicked
document.querySelector('.create').addEventListener('click', () => {
    window.unwebber.newDocument.create({
        title: "Untitled",
        width: 1080,//screen.width,
        height: 1080,//screen.height,
        units: "px",
    });
    window.unwebber.newDocument.close();
})

// Close the dialog when the close button is clicked
document.querySelectorAll('.close').forEach((element) => {
    element.addEventListener('click', () => {
        window.unwebber.newDocument.close();
    })
});

// Dim the title bar when the window loses focus
window.addEventListener("blur", () => {
    document.querySelector('.title-bar .title').style.opacity = 0.5;
    document.querySelector('.title-bar .controls').style.opacity = 0.5;
});

// Restore the title bar when the window gains focus
window.addEventListener("focus", () => {
    document.querySelector('.title-bar .title').style.opacity = 1;
    document.querySelector('.title-bar .controls').style.opacity = 1;
});

// Close the window when the escape key is pressed
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.unwebber.newDocument.close();
    }
});
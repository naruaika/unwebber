Array.from(document.querySelectorAll('.main-sidebar__section .header')).forEach(element => {
    element.addEventListener('click', () => {
        element.classList.toggle('opened');
        element.parentNode.classList.toggle('opened');
        element.parentNode.querySelector('.content').classList.toggle('opened');
    });
});
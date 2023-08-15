const header = document.querySelector("header");

window.addEventListener("scroll", function() {
    header.classList.toggle("sticky",window.scrollY > 60);
});

// document.addEventListener('DOMContentLoaded', function () {
//     const menuIcon = document.getElementById('menu-icon');
//     const navbar = document.getElementById('navbar');

//     menuIcon.addEventListener('click', function () {
//         navbar.classList.toggle('active');
//     });
// });

let menu = document.querySelector('#menu-icon');
let navbar = document.querySelector('.navbar');

menu.onclick = () => {
    menu.classList.toggle('bx-x');
    navbar.classList.toggle('open');
};

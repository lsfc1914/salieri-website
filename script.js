// Lightweight mobile navigation behavior; booking links currently open WhatsApp.
const links = document.querySelectorAll('.links a');
links.forEach(link => link.addEventListener('click', () => document.querySelector('.links').classList.remove('open')));

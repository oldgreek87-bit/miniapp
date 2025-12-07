// Expandable description
function toggleDescription(id, btn) {
    const el = document.getElementById(id);
    const collapsed = el.classList.contains("collapsed");

    if (collapsed) {
        el.classList.remove("collapsed");
        btn.innerText = btn.innerText.replace("↓", "↑");
    } else {
        el.classList.add("collapsed");
        btn.innerText = btn.innerText.replace("↑", "↓");
    }
}

// Carousel logic
let currentSlide = 0;

function goToSlide(n) {
    const carousel = document.getElementById("carousel");
    const dots = document.querySelectorAll(".dot");

    currentSlide = n;
    carousel.style.transform = `translateX(-${n * 100}%)`;

    dots.forEach((dot, i) => dot.classList.toggle("active", i === n));
}

// Swipe gesture
let startX = 0;

document.getElementById("carousel").addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
});

document.getElementById("carousel").addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (diff > 50 && currentSlide < 1) goToSlide(1);
    if (diff < -50 && currentSlide > 0) goToSlide(0);
});

// THESE BUTTONS — YOUR ORIGINAL ONES
function openSubscription() {
    window.location.href = "purchase.html";
}

function mySubscription() {
    window.location.href = "mysubscription.html";
}

function readingRoom() {
    window.location.href = "reading-room.html";
}

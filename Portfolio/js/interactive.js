document.addEventListener("DOMContentLoaded", () => {
    // 1. Custom Cursor
    const dot = document.getElementById("cursor-dot");
    const follower = document.getElementById("cursor-follower");

    if (dot && follower) {
        gsap.set(dot, { xPercent: -50, yPercent: -50 });
        gsap.set(follower, { xPercent: -50, yPercent: -50 });

        const xToDot = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power3" });
        const yToDot = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power3" });
        
        const xToFollower = gsap.quickTo(follower, "x", { duration: 0.6, ease: "power3" });
        const yToFollower = gsap.quickTo(follower, "y", { duration: 0.6, ease: "power3" });

        window.addEventListener("mousemove", (e) => {
            xToDot(e.clientX);
            yToDot(e.clientY);
            xToFollower(e.clientX);
            yToFollower(e.clientY);
        });

        const interactables = document.querySelectorAll("a, button, .card, .stat-item, .nav-link, .terminal-btn, .details-btn");
        interactables.forEach(el => {
            el.addEventListener("mouseenter", () => {
                gsap.to(follower, { scale: 1.5, backgroundColor: "rgba(255, 215, 0, 0.2)", borderColor: "var(--gold)", duration: 0.3 });
                gsap.to(dot, { scale: 0, duration: 0.2 });
            });
            el.addEventListener("mouseleave", () => {
                gsap.to(follower, { scale: 1, backgroundColor: "rgba(255, 215, 0, 0.05)", borderColor: "rgba(255, 215, 0, 0.5)", duration: 0.3 });
                gsap.to(dot, { scale: 1, duration: 0.2 });
            });
        });
    }

    // 2. Interactive Background
    const bg = document.getElementById("interactive-bg");
    if (bg) {
        // Create 3 layers for parallax
        const layers = [];
        for (let i = 1; i <= 3; i++) {
            const layer = document.createElement("div");
            layer.style.position = "absolute";
            layer.style.width = "100%";
            layer.style.height = "100%";
            bg.appendChild(layer);
            layers.push({ el: layer, depth: i * 20 });
            
            // Add elements to this layer
            for (let j = 0; j < 25; j++) {
                const node = document.createElement("div");
                node.style.position = "absolute";
                const size = Math.random() * 3 + 1;
                node.style.width = size + "px";
                node.style.height = size + "px";
                node.style.backgroundColor = "var(--gold)";
                node.style.opacity = Math.random() * 0.4 + 0.1;
                node.style.borderRadius = "50%";
                node.style.boxShadow = "0 0 8px var(--gold)";
                
                node.style.left = Math.random() * 100 + "%";
                node.style.top = Math.random() * 100 + "%";
                
                layer.appendChild(node);
                
                gsap.to(node, {
                    x: Math.random() * 60 - 30,
                    y: Math.random() * 60 - 30,
                    duration: Math.random() * 5 + 5,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut"
                });
            }
        }

        const xToLayers = layers.map(layer => gsap.quickTo(layer.el, "x", { duration: 1, ease: "power2.out" }));
        const yToLayers = layers.map(layer => gsap.quickTo(layer.el, "y", { duration: 1, ease: "power2.out" }));

        window.addEventListener("mousemove", (e) => {
            const xOffset = (e.clientX / window.innerWidth - 0.5);
            const yOffset = (e.clientY / window.innerHeight - 0.5);
            
            layers.forEach((layer, index) => {
                xToLayers[index](xOffset * layer.depth);
                yToLayers[index](yOffset * layer.depth);
            });
        });
    }
});

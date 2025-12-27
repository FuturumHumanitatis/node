<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Golden Ratio | MathVerse</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Space+Grotesk:wght@300;500;700&display=swap" rel="stylesheet">

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- P5.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js"></script>

    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        deep: '#050505',
                        glass: 'rgba(255, 255, 255, 0.03)',
                        neon: '#00f3ff',
                        accent: '#7000ff',
                    },
                    fontFamily: {
                        sans: ['"Space Grotesk"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                        serif: ['"Merriweather"', 'serif'],
                    }
                }
            }
        }
    </script>

    <style>
        /* 1. ATMOSPHERE & BASICS */
        body {
            background-color: #050505;
            color: #e0e0e0;
            overflow-x: hidden;
            cursor: none; /* Hide default cursor */
        }

        /* 2. NOISE TEXTURE OVERLAY */
        .noise-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            opacity: 0.06;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
        }

        /* 3. CUSTOM CURSOR */
        #cursor {
            position: fixed;
            top: 0;
            left: 0;
            width: 20px;
            height: 20px;
            border: 1px solid white;
            background-color: white; /* Needed for difference mode */
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
            mix-blend-mode: difference; /* Inverts colors */
            transition: transform 0.15s ease-out, width 0.2s, height 0.2s;
        }

        /* Cursor hover state */
        body:has(a:hover) #cursor,
        body:has(input:hover) #cursor,
        body:has(.math:hover) #cursor {
            transform: translate(-50%, -50%) scale(1.5);
            background-color: transparent;
            border-color: #00f3ff;
        }

        /* 4. TYPOGRAPHY & INTERACTION */
        .math {
            font-family: 'Merriweather', serif;
            font-style: italic;
            transition: color 0.3s ease, text-shadow 0.3s ease;
            cursor: none; /* Ensure custom cursor stays */
            display: inline-block;
        }

        /* Formula Hover Effect */
        .math:hover {
            color: #00f3ff;
            text-shadow: 0 0 8px rgba(0, 243, 255, 0.5);
        }

        .math-block {
            background: rgba(255,255,255,0.02);
            border-left: 2px solid #333;
            padding: 1rem 2rem;
            margin: 2rem 0;
            font-family: 'Merriweather', serif;
            transition: border-color 0.3s;
        }
        .math-block:hover {
            border-left-color: #00f3ff;
        }

        /* 5. UI ELEMENTS */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        input[type=range] {
            -webkit-appearance: none;
            width: 100%;
            background: transparent;
            cursor: none; /* Custom cursor handles this */
        }
        input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #00f3ff;
            margin-top: -6px;
            box-shadow: 0 0 10px #00f3ff;
        }
        input[type=range]::-webkit-slider-runnable-track {
            width: 100%;
            height: 2px;
            background: #333;
        }

        .sticky-col { position: sticky; top: 120px; height: fit-content; }
        .glass-panel {
            background: rgba(20, 20, 25, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="antialiased selection:bg-neon selection:text-black">

    <!-- NOISE OVERLAY -->
    <div class="noise-overlay"></div>

    <!-- CUSTOM CURSOR -->
    <div id="cursor"></div>

    <!-- NAVIGATION -->
    <nav class="fixed top-0 w-full z-50 py-4 px-8 flex justify-between items-center border-b border-white/5 bg-deep/80 backdrop-blur-md">
        <a href="#" class="flex items-center gap-2 text-gray-400 hover:text-neon transition-colors group">
            <span class="font-mono text-xs group-hover:-translate-x-1 transition-transform">← BACK_TO_CATALOG</span>
        </a>
        <div class="font-sans font-bold tracking-tight">MATH<span class="text-neon">VERSE</span> / READER</div>
        <div class="w-24"></div>
    </nav>

    <main class="max-w-[1600px] mx-auto pt-28 pb-20 px-6 relative z-10">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">

            <!-- TOC -->
            <aside class="hidden lg:block lg:col-span-2 relative">
                <div class="sticky-col pl-4 border-l border-white/10">
                    <h4 class="font-mono text-xs text-neon mb-6 tracking-widest">CONTENTS</h4>
                    <ul class="space-y-4 font-sans text-sm text-gray-500">
                        <li><a href="#intro" class="hover:text-white transition-colors block border-l-2 border-transparent hover:border-white pl-2 -ml-2.5">01. Introduction</a></li>
                        <li><a href="#math" class="hover:text-white transition-colors block border-l-2 border-transparent hover:border-white pl-2 -ml-2.5">02. The Definition</a></li>
                        <li><a href="#nature" class="hover:text-white transition-colors block border-l-2 border-transparent hover:border-white pl-2 -ml-2.5">03. Phyllotaxis</a></li>
                        <li><a href="#sim" class="hover:text-white transition-colors block border-l-2 border-transparent hover:border-white pl-2 -ml-2.5">04. Simulation</a></li>
                    </ul>
                    <div class="mt-12 opacity-50">
                        <h4 class="font-mono text-xs text-gray-600 mb-2">PAPER_ID</h4>
                        <p class="font-mono text-xs text-gray-400">MV-8921-PHI</p>
                    </div>
                </div>
            </aside>

            <!-- ARTICLE -->
            <article class="lg:col-span-6 font-serif leading-relaxed text-gray-300">
                <header class="mb-12 border-b border-white/10 pb-8">
                    <div class="flex gap-3 mb-4 font-mono text-xs text-neon">
                        <span class="border border-neon/30 px-2 py-0.5 rounded">ALGORITHM</span>
                        <span class="border border-neon/30 px-2 py-0.5 rounded">NATURE</span>
                    </div>
                    <h1 class="font-sans text-4xl md:text-5xl font-bold text-white mb-6">The Divine Proportion: <br>Algorithmic Beauty of <span class="math text-accent">φ</span></h1>
                    <p class="text-lg text-gray-400 italic">
                        "Mathematics is the alphabet with which God has written the universe." — Galileo Galilei
                    </p>
                </header>

                <section id="intro" class="mb-12">
                    <p class="mb-4 text-lg">
                        The Golden Ratio, often denoted by the Greek letter phi (<span class="math text-xl">φ</span>), is an irrational number approximately equal to 1.61803398. It appears frequently in geometry, art, architecture, and other areas.
                    </p>
                    <p class="mb-4">
                        But its most fascinating application lies in nature's efficiency algorithms. How do plants arrange their leaves to maximize sunlight? How do flowers pack seeds?
                    </p>
                </section>

                <section id="math" class="mb-12">
                    <h2 class="font-sans text-2xl font-bold text-white mb-4">02. Mathematical Definition</h2>
                    <p class="mb-4">
                        Two quantities are in the golden ratio if their ratio is the same as the ratio of their sum to the larger of the two quantities. Expressed algebraically:
                    </p>

                    <div class="math-block text-xl text-center text-white">
                        <span class="math">φ</span> = <span class="text-3xl mx-2">½</span> (1 + <span class="text-2xl">√</span>5) ≈ <span class="math text-neon">1.61803...</span>
                    </div>

                    <p class="mb-4">
                        This number is intimately connected to the Fibonacci sequence (<span class="math">0, 1, 1, 2, 3, 5...</span>), where the ratio of consecutive numbers converges to <span class="math">φ</span>.
                    </p>
                </section>

                <section id="nature" class="mb-12">
                    <h2 class="font-sans text-2xl font-bold text-white mb-4">03. Phyllotaxis</h2>
                    <p class="mb-4">
                        In botany, phyllotaxis is the arrangement of leaves on a plant stem. The most common angle between successive leaves is the <strong>Golden Angle</strong>:
                    </p>
                    <div class="font-mono text-neon text-center py-4 text-xl border-y border-white/5 my-4 hover:tracking-widest transition-all cursor-crosshair">137.50776°</div>
                    <p>
                        This specific angle ensures that no leaf completely shades another. It is nature's way of optimizing for light absorption.
                    </p>
                </section>

                <section id="sim" class="mb-20">
                    <h2 class="font-sans text-2xl font-bold text-white mb-4">04. Simulation Notes</h2>
                    <p>
                        Interact with the panel on the right. Notice how even a <span class="math text-red-400">0.1°</span> deviation from the Golden Angle destroys the packing efficiency, creating gaps or spiral arms.
                    </p>
                </section>
            </article>

            <!-- SIMULATION LAB -->
            <aside class="lg:col-span-4 relative">
                <div class="sticky-col">
                    <div class="glass-panel rounded-xl overflow-hidden p-1 shadow-2xl shadow-neon/5 ring-1 ring-white/10">
                        <div class="bg-black/40 px-4 py-3 border-b border-white/10 flex justify-between items-center">
                            <span class="font-mono text-xs text-neon animate-pulse">/// LIVE_RENDER</span>
                            <div class="flex gap-1">
                                <div class="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                                <div class="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                            </div>
                        </div>

                        <div id="canvas-container" class="w-full h-[350px] bg-black relative cursor-none"></div>

                        <div class="p-6">
                            <div class="flex justify-between items-end mb-2">
                                <label class="font-sans text-sm font-bold text-white">Divergence Angle</label>
                                <span id="angle-display" class="font-mono text-neon text-lg">137.5°</span>
                            </div>
                            <input type="range" id="angle-slider" min="135" max="140" step="0.01" value="137.5" class="mb-6">

                            <div class="flex justify-between items-end mb-2">
                                <label class="font-sans text-sm font-bold text-gray-400">Scale</label>
                            </div>
                            <input type="range" id="c-slider" min="2" max="8" step="0.1" value="4">
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    </main>

    <!-- LOGIC SCRIPTS -->
    <script>
        // --- 1. CUSTOM CURSOR LOGIC ---
        const cursor = document.getElementById('cursor');

        document.addEventListener('mousemove', (e) => {
            // Using requestAnimationFrame for smoother performance
            requestAnimationFrame(() => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });
        });

        document.addEventListener('mousedown', () => {
            cursor.style.transform = "translate(-50%, -50%) scale(0.8)";
        });

        document.addEventListener('mouseup', () => {
            cursor.style.transform = "translate(-50%, -50%) scale(1)";
        });

        // --- 2. P5.JS SIMULATION ---
        const sketch = (p) => {
            let angleSlider, cSlider, angleDisplay;
            let container;

            p.setup = () => {
                container = document.getElementById('canvas-container');
                let canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
                canvas.parent('canvas-container');
                p.angleMode(p.DEGREES);
                p.colorMode(p.HSB);

                angleSlider = document.getElementById('angle-slider');
                cSlider = document.getElementById('c-slider');
                angleDisplay = document.getElementById('angle-display');
            };

            p.draw = () => {
                p.background(5, 0.8); // Slight opacity for trails? No, keep it clean for science

                angleDisplay.innerText = angleSlider.value + "°";
                let angle = parseFloat(angleSlider.value);
                let c = parseFloat(cSlider.value);

                p.translate(p.width / 2, p.height / 2);

                // Draw dots
                for (let i = 0; i < 500; i++) {
                    let a = i * angle;
                    let r = c * p.sqrt(i);
                    let x = r * p.cos(a);
                    let y = r * p.sin(a);

                    let dist = p.dist(0,0,x,y);
                    // Color Logic: HSB Hue based on distance + slight rotation
                    let hu = (dist * 0.5 + p.frameCount * 0.2) % 360;

                    // Logic to highlight "Golden Ratio" perfection
                    let isPerfect = Math.abs(angle - 137.5) < 0.1;

                    if (isPerfect) {
                        p.fill(160, 200, 255); // Cyan/Blue uniform
                        p.noStroke();
                        p.ellipse(x, y, c, c);
                    } else {
                        // Chaos colors
                        p.fill(hu, 200, 255);
                        p.noStroke();
                        p.ellipse(x, y, c * 0.8, c * 0.8);
                    }
                }
            };

            p.windowResized = () => {
                p.resizeCanvas(container.offsetWidth, container.offsetHeight);
            }
        };

        new p5(sketch);
    </script>
</body>
</html>

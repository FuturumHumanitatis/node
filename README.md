<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobius Explorer: Scientific Edition</title>
    <style>
        body { 
            margin: 0; 
            overflow: hidden; 
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); /* Светлый чистый фон */
            font-family: 'Segoe UI', sans-serif; 
        }
        canvas { display: block; }
        
        #ui-container {
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 100;
        }

        /* Стиль для loader */
        #loader {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #f5f7fa; display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            color: #333; font-size: 18px; z-index: 999; transition: opacity 0.5s;
        }
        .spinner {
            width: 40px; height: 40px; 
            border: 4px solid #ccc; border-top-color: #333; 
            border-radius: 50%; animation: spin 1s linear infinite;
            margin-bottom: 15px;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
    
    <!-- Импорт Three.js -->
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>
</head>
<body>

<div id="loader">
    <div class="spinner"></div>
    <div>Генерация геометрии...</div>
</div>

<script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

    // --- КОНФИГУРАЦИЯ ---
    const PARAMS = {
        radius: 7,
        width: 3,
        twists: 1,      // 1 = Лента Мебиуса
        segments: 150,  // Детализация длины
        widthSegments: 40, // Детализация ширины
        antSpeed: 1.0,
        showWireframe: false,
        bgColor: '#f5f7fa',
        stripColor: '#e1e5ea'
    };

    // --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
    let scene, camera, renderer, controls;
    let mobiusMesh;
    let antRoot; // Корневой объект муравья
    const clock = new THREE.Clock();
    
    // Raycaster для привязки к поверхности
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0); // В локальных координатах муравья это "вниз"

    // Состояние муравья
    const antState = {
        u: 0, // Позиция вдоль ленты (параметрическая)
        v: 0, // Позиция поперек (-1..1)
        legs: [], // Массив ног для анимации
        antennae: [] // Массив усов
    };

    init();
    animate();

    function init() {
        // 1. СЦЕНА И КАМЕРА
        scene = new THREE.Scene();
        // Мягкий туман для глубины (светлый)
        scene.fog = new THREE.Fog(0xf5f7fa, 20, 60);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(15, 12, 15);

        // 2. РЕНДЕРЕР (Без пост-эффектов, чистый WebGL)
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Мягкие тени
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.body.appendChild(renderer.domElement);

        // 3. КОНТРОЛЛЕР
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.maxDistance = 50;

        // 4. ОСВЕЩЕНИЕ (Студийное, яркое)
        setupLighting();

        // 5. ОБЪЕКТЫ
        createMobiusStrip();
        createRealisticAnt();

        // 6. UI
        setupGUI();

        // Обработка ресайза
        window.addEventListener('resize', onWindowResize);

        // Скрыть лоадер
        document.getElementById('loader').style.opacity = 0;
        setTimeout(() => document.getElementById('loader').remove(), 500);
    }

    function setupLighting() {
        // Яркий заполняющий свет
        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        scene.add(ambient);

        // Основной рисующий свет (солнце)
        const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
        mainLight.position.set(10, 20, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0001;
        scene.add(mainLight);

        // Контровой свет (для объема)
        const rimLight = new THREE.DirectionalLight(0xddeeff, 1.0);
        rimLight.position.set(-10, 5, -10);
        scene.add(rimLight);
    }

    // --- ЛЕНТА МЁБИУСА ---

    function getMobiusPoint(u, v, target) {
        const R = PARAMS.radius;
        const w = PARAMS.width / 2;
        
        // Формула с учетом скручивания
        const alpha = (PARAMS.twists * u) / 2;
        
        const x = (R + w * v * Math.cos(alpha)) * Math.cos(u);
        const y = w * v * Math.sin(alpha); // Y вверх
        const z = (R + w * v * Math.cos(alpha)) * Math.sin(u);

        target.set(x, y, z);
    }

    function createMobiusStrip() {
        if (mobiusMesh) {
            mobiusMesh.geometry.dispose();
            scene.remove(mobiusMesh);
        }

        const geometry = new THREE.BufferGeometry();
        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];

        const uSeg = PARAMS.segments;
        const vSeg = PARAMS.widthSegments;

        // Генерация вершин
        for (let i = 0; i <= uSeg; i++) {
            const u = (i / uSeg) * Math.PI * 2;
            for (let j = 0; j <= vSeg; j++) {
                const v = (j / vSeg) * 2 - 1; // -1..1
                const p = new THREE.Vector3();
                getMobiusPoint(u, v, p);
                vertices.push(p.x, p.y, p.z);
                uvs.push(i / uSeg, j / vSeg);
            }
        }

        // Индексы
        for (let i = 0; i < uSeg; i++) {
            for (let j = 0; j < vSeg; j++) {
                const a = i * (vSeg + 1) + j;
                const b = (i + 1) * (vSeg + 1) + j;
                const c = (i + 1) * (vSeg + 1) + (j + 1);
                const d = i * (vSeg + 1) + (j + 1);
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.computeVertexNormals();

        // Материал: Чистый, матовый, хорошо принимает тени
        const material = new THREE.MeshStandardMaterial({
            color: PARAMS.stripColor,
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide, // Обязательно DoubleSide для ленты
            wireframe: PARAMS.showWireframe
        });

        mobiusMesh = new THREE.Mesh(geometry, material);
        mobiusMesh.receiveShadow = true;
        mobiusMesh.castShadow = true;
        scene.add(mobiusMesh);
    }

    // --- МОДЕЛЬ МУРАВЬЯ ---

    function createRealisticAnt() {
        if (antRoot) scene.remove(antRoot);
        antRoot = new THREE.Group();

        // Материалы
        const bodyColor = 0x8B4513; // Коричневый
        const legColor = 0x5c2e0e; // Темно-коричневый
        
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: bodyColor, roughness: 0.3, metalness: 0.1 
        });
        const eyeMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x000000, roughness: 0.0, clearcoat: 1.0 
        }); // Блестящие глаза

        // 1. ТЕЛО (3 сегмента)
        
        // Брюшко (Abdomen)
        const abdomenGeo = new THREE.SphereGeometry(0.35, 32, 32);
        abdomenGeo.scale(1, 0.9, 1.3);
        const abdomen = new THREE.Mesh(abdomenGeo, bodyMat);
        abdomen.position.z = -0.55;
        abdomen.castShadow = true;

        // Грудь (Thorax)
        const thoraxGeo = new THREE.SphereGeometry(0.25, 32, 32);
        thoraxGeo.scale(0.9, 0.9, 1.1);
        const thorax = new THREE.Mesh(thoraxGeo, bodyMat);
        thorax.position.z = 0; // Центр муравья
        thorax.castShadow = true;

        // Голова (Head)
        const headGeo = new THREE.SphereGeometry(0.22, 32, 32);
        headGeo.scale(1, 0.85, 1);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.z = 0.45;
        head.castShadow = true;

        // 2. ГЛАЗА
        const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(0.12, 0.05, 0.12); // Относительно головы
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(-0.12, 0.05, 0.12);
        head.add(eyeL, eyeR);

        // 3. АНТЕННЫ (Усы)
        antState.antennae = [];
        const antennaCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.05, 0.1, 0.2),
            new THREE.Vector3(0.1, 0.15, 0.4)
        ]);
        const antennaGeo = new THREE.TubeGeometry(antennaCurve, 8, 0.015, 6, false);
        const antennaMat = new THREE.MeshStandardMaterial({ color: legColor });
        
        const antL = new THREE.Mesh(antennaGeo, antennaMat);
        antL.position.set(0.08, 0.1, 0.18);
        
        const antR = new THREE.Mesh(antennaGeo, antennaMat);
        antR.position.set(-0.08, 0.1, 0.18);
        antR.scale.set(-1, 1, 1); // Отразить

        head.add(antL, antR);
        antState.antennae.push(antL, antR);

        // Сборка тела
        const bodyGroup = new THREE.Group();
        bodyGroup.add(abdomen, thorax, head);
        antRoot.add(bodyGroup);
        antRoot.userData.body = bodyGroup; // Ссылка для анимации покачивания

        // 4. НОГИ (Сложная структура)
        antState.legs = [];
        // Позиции ног на груди (z) и начальный разлет (y-rot)
        const legConfigs = [
            { z: 0.15, rot: Math.PI / 4, side: 1 },  // Передние L
            { z: 0.15, rot: -Math.PI / 4, side: -1 },// Передние R
            { z: 0.0, rot: Math.PI / 2, side: 1 },   // Средние L
            { z: 0.0, rot: -Math.PI / 2, side: -1 }, // Средние R
            { z: -0.15, rot: 3 * Math.PI / 4, side: 1 }, // Задние L
            { z: -0.15, rot: -3 * Math.PI / 4, side: -1 } // Задние R
        ];

        legConfigs.forEach((conf, i) => {
            const leg = createLeg(conf.side, legColor);
            leg.root.position.set(conf.side * 0.15, -0.05, conf.z);
            leg.root.rotation.y = conf.rot;
            thorax.add(leg.root);
            
            antState.legs.push({
                parts: leg,
                config: conf,
                index: i,
                phase: (i % 2 === 0) ? 0 : Math.PI // Разные фазы для "трипод" походки
            });
        });

        // Масштабируем всего муравья
        antRoot.scale.setScalar(0.8);
        scene.add(antRoot);
    }

    // Создание одной ноги из 3 сегментов: Coxa -> Femur -> Tibia
    function createLeg(side, color) {
        const mat = new THREE.MeshStandardMaterial({ color: color });
        
        // 1. Coxa (Тазик) - соединение с телом
        const coxaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2);
        coxaGeo.rotateZ(Math.PI / 2);
        coxaGeo.translate(0.1, 0, 0); // Pivot в начале
        const coxa = new THREE.Mesh(coxaGeo, mat);

        // 2. Femur (Бедро) - идет вверх
        const femurGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4);
        femurGeo.rotateZ(Math.PI / 2);
        femurGeo.translate(0.2, 0, 0);
        const femur = new THREE.Mesh(femurGeo, mat);
        femur.position.x = 0.2; // Конец coxa
        femur.rotation.z = side * Math.PI / 3; // Подъем вверх
        coxa.add(femur);

        // 3. Tibia (Голень) - идет вниз к земле
        const tibiaGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.5);
        tibiaGeo.rotateZ(Math.PI / 2);
        tibiaGeo.translate(0.25, 0, 0);
        const tibia = new THREE.Mesh(tibiaGeo, mat);
        tibia.position.x = 0.4; // Конец femur
        tibia.rotation.z = side * -Math.PI / 1.5; // Резко вниз
        femur.add(tibia);

        return { root: coxa, coxa, femur, tibia };
    }

    // --- ЛОГИКА АНИМАЦИИ И ФИЗИКИ ---

    function updateAnt(delta) {
        if (!antRoot) return;
        
        const speed = PARAMS.antSpeed;
        antState.u += speed * delta;

        // 1. ПАРАМЕТРИЧЕСКИЙ РАСЧЕТ (Грубая позиция)
        // Находим точку, где муравей "должен" быть математически
        const targetPos = new THREE.Vector3();
        const targetNext = new THREE.Vector3();
        const targetSide = new THREE.Vector3();

        getMobiusPoint(antState.u, antState.v, targetPos);
        getMobiusPoint(antState.u + 0.05, antState.v, targetNext);
        getMobiusPoint(antState.u, antState.v + 0.1, targetSide);

        // Вычисляем базисные вектора (фрейм)
        const forward = new THREE.Vector3().subVectors(targetNext, targetPos).normalize();
        const tempSide = new THREE.Vector3().subVectors(targetSide, targetPos).normalize();
        let normal = new THREE.Vector3().crossVectors(forward, tempSide).normalize();

        // 2. RAYCASTING (Привязка к поверхности)
        // Чтобы муравей не проваливался, пускаем луч к ленте
        // Смещаемся чуть "вверх" по нормали от идеальной точки и стреляем "вниз"
        
        const rayOrigin = targetPos.clone().add(normal.clone().multiplyScalar(1.0));
        const rayDir = normal.clone().negate(); // Вниз против нормали

        raycaster.set(rayOrigin, rayDir);
        const intersects = raycaster.intersectObject(mobiusMesh);

        if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Ставим муравья точно в точку пересечения
            antRoot.position.copy(hit.point);
            
            // Используем нормаль полигона для идеального выравнивания
            const surfaceNormal = hit.face.normal.clone();
            // Трансформируем нормаль с учетом вращения меша (если бы он вращался, здесь он статичен, но полезно для общего случая)
            surfaceNormal.transformDirection(mobiusMesh.matrixWorld).normalize();

            // Ориентация
            const lookTarget = hit.point.clone().add(forward);
            const up = surfaceNormal;
            
            const matrix = new THREE.Matrix4();
            matrix.lookAt(lookTarget, hit.point, up);
            antRoot.quaternion.setFromRotationMatrix(matrix);
        } else {
            // Фолбек на математику, если луч промахнулся (на краях)
            antRoot.position.copy(targetPos);
            antRoot.lookAt(targetNext);
        }

        // 3. ПРОЦЕДУРНАЯ АНИМАЦИЯ (Ноги и Тело)
        const time = clock.elapsedTime * speed * 8; // Скорость шага

        // А. Покачивание тела
        const sway = Math.sin(time) * 0.02;
        const bounce = Math.abs(Math.cos(time)) * 0.02;
        antRoot.userData.body.position.y = 0.15 + bounce; // Центр тяжести над землей
        antRoot.userData.body.rotation.z = sway; // Наклон влево-вправо
        antRoot.userData.body.rotation.y = Math.cos(time * 0.5) * 0.05; // Легкий поворот корпуса

        // Б. Антенны (Высокочастотная дрожь)
        antState.antennae.forEach((ant, i) => {
            const noise = Math.sin(time * 3 + i) * 0.1;
            ant.rotation.z = noise;
            ant.rotation.y = noise * 0.5;
        });

        // В. Ноги (Tripod Gait)
        antState.legs.forEach(leg => {
            // Вычисляем фазу для этой ноги
            // Tripod: ноги 0, 2, 5 (L1, L3, R2) в одной фазе, 1, 3, 4 (R1, L2, R3) в другой
            // Индексы: 0(FL), 1(FR), 2(ML), 3(MR), 4(BL), 5(BR)
            // Группа А: 0, 3, 4. Группа Б: 1, 2, 5
            
            const isGroupA = [0, 3, 4].includes(leg.index);
            const legPhase = isGroupA ? 0 : Math.PI;
            const cycle = time + legPhase;

            // Движение вперед-назад (Coxa)
            const forwardSwing = Math.cos(cycle) * 0.25;
            leg.parts.coxa.rotation.y = forwardSwing;

            // Движение вверх-вниз (Femur lift)
            // Поднимаем ногу только когда она идет вперед (возвратная фаза)
            const lift = Math.max(0, Math.sin(cycle)) * 0.4;
            
            // Применяем вращения к суставам
            leg.parts.femur.rotation.z = (leg.config.side * Math.PI / 3) + (leg.config.side * lift);
            
            // Компенсация Tibia (чтобы касалась земли)
            // Когда бедро поднимается, голень немного распрямляется
            leg.parts.tibia.rotation.z = (leg.config.side * -Math.PI / 1.5) - (leg.config.side * lift * 0.5);
        });
    }

    // --- GUI И СОБЫТИЯ ---

    function setupGUI() {
        const gui = new GUI({ title: 'Параметры' });
        
        const fGeo = gui.addFolder('Геометрия');
        fGeo.add(PARAMS, 'twists', 0, 4, 0.1).name('Скручивания').onChange(createMobiusStrip);
        fGeo.add(PARAMS, 'width', 1, 5).name('Ширина').onChange(createMobiusStrip);
        fGeo.add(PARAMS, 'radius', 4, 10).name('Радиус').onChange(createMobiusStrip);
        fGeo.add(PARAMS, 'showWireframe').name('Сетка').onChange(createMobiusStrip);

        const fAnt = gui.addFolder('Муравей');
        fAnt.add(PARAMS, 'antSpeed', 0, 3).name('Скорость');
        
        gui.open();
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Поворот всей сцены для обзора (если пользователь не крутит камерой)
        // Но OrbitControls это перебивает, оставим статику для научного вида
        
        updateAnt(delta);
        controls.update();
        renderer.render(scene, camera);
    }

</script>
</body>
</html>

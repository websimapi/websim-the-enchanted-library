import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class EnchantedLibrary {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas'),
            antialias: true 
        });
        
        this.clock = new THREE.Clock();
        this.moveVector = new THREE.Vector3();
        this.keys = {};
        
        this.init();
    }
    
    init() {
        this.setupRenderer();
        this.setupControls();
        this.createLibraryEnvironment();
        this.setupLighting();
        this.setupEventListeners();
        this.animate();
        
        // Hide instructions after a few seconds
        setTimeout(() => {
            document.getElementById('instructions').classList.add('fade-out');
        }, 4000);
    }
    
    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
    }
    
    setupControls() {
        this.controls = new PointerLockControls(this.camera, document.body);
        this.camera.position.set(0, 2, 0);
        
        document.addEventListener('click', () => {
            this.controls.lock();
        });
    }
    
    createLibraryTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Dark library background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a0f0a');
        gradient.addColorStop(0.3, '#2a1f1a');
        gradient.addColorStop(1, '#0f0a08');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Book shelves
        ctx.fillStyle = '#3a2a1a';
        for (let i = 0; i < 8; i++) {
            const x = (i / 8) * canvas.width;
            ctx.fillRect(x, canvas.height * 0.2, canvas.width / 12, canvas.height * 0.6);
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createCeilingPortrait() {
        // Load the AI generated portrait
        const loader = new THREE.TextureLoader();
        return loader.load('./ceiling_portrait.png', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        });
    }
    
    createLibraryEnvironment() {
        // Create the main cylindrical library space
        const libraryGeometry = new THREE.CylinderGeometry(15, 15, 12, 32, 1, true);
        
        // Create the dripping paint material
        const libraryMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseTexture: { value: this.createLibraryTexture() },
                paintTexture: { value: this.createCeilingPortrait() },
                dripIntensity: { value: 1.2 },
                colorShift: { value: 0.3 },
                dripSpeed: { value: 0.8 },
                distortionStrength: { value: 0.4 }
            },
            vertexShader: this.getVertexShader(),
            fragmentShader: this.getFragmentShader(),
            side: THREE.DoubleSide,
            transparent: true
        });
        
        const libraryWalls = new THREE.Mesh(libraryGeometry, libraryMaterial);
        this.scene.add(libraryWalls);
        this.libraryMaterial = libraryMaterial;
        
        // Create floor
        const floorGeometry = new THREE.CircleGeometry(15, 32);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2a1810,
            transparent: true,
            opacity: 0.9 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -6;
        this.scene.add(floor);
        
        // Create floating paint droplets
        this.createPaintDroplets();
    }
    
    createPaintTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Transparent base
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Painted story elements
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height * 0.4;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.7;
            
            // Paint blob shapes
            ctx.beginPath();
            ctx.ellipse(x, y, 30 + Math.random() * 40, 20 + Math.random() * 30, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createPaintDroplets() {
        const dropletGeometry = new THREE.SphereGeometry(0.02, 8, 6);
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
        
        this.paintDroplets = [];
        
        for (let i = 0; i < 50; i++) {
            const material = new THREE.MeshBasicMaterial({ 
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 0.8
            });
            
            const droplet = new THREE.Mesh(dropletGeometry, material);
            
            // Position around the cylinder
            const angle = Math.random() * Math.PI * 2;
            const radius = 14.5;
            droplet.position.x = Math.cos(angle) * radius;
            droplet.position.z = Math.sin(angle) * radius;
            droplet.position.y = 6 + Math.random() * 2;
            
            droplet.userData = {
                fallSpeed: 0.5 + Math.random() * 1.5,
                initialY: droplet.position.y,
                angle: angle
            };
            
            this.scene.add(droplet);
            this.paintDroplets.push(droplet);
        }
    }
    
    getVertexShader() {
        return `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            varying float vHeight;
            uniform float time;
            uniform float dripIntensity;
            
            void main() {
                vUv = uv;
                vHeight = position.y / 6.0; // Normalize height
                
                vec3 pos = position;
                
                // Enhanced dripping effect with pixel-region pulls
                if (pos.y > 0.0) {
                    float heightFactor = pos.y / 6.0;
                    float dripNoise = sin(time * 0.8 + pos.x * 15.0) * cos(time * 0.6 + pos.z * 10.0);
                    float regionPull = sin(pos.x * 8.0 + time) * cos(pos.z * 6.0 + time * 0.7);
                    
                    float totalDrip = (dripNoise + regionPull * 0.7) * 0.15 * dripIntensity * heightFactor;
                    pos.y += totalDrip;
                    
                    // Slight inward pull as paint drips
                    float pullStrength = abs(totalDrip) * 0.3;
                    pos.x *= (1.0 - pullStrength);
                    pos.z *= (1.0 - pullStrength);
                }
                
                vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;
    }
    
    getFragmentShader() {
        return `
            uniform float time;
            uniform sampler2D baseTexture;
            uniform sampler2D paintTexture;
            uniform float dripIntensity;
            uniform float colorShift;
            uniform float dripSpeed;
            uniform float distortionStrength;
            
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            varying float vHeight;
            
            void main() {
                vec2 uv = vUv;
                
                // Enhanced dripping distortion
                float dripTime = time * dripSpeed;
                float heightMask = smoothstep(-0.5, 1.0, vHeight);
                
                // Create vertical streaking effect
                float verticalStreak = sin(uv.x * 20.0 + dripTime) * cos(uv.x * 15.0 + dripTime * 0.8);
                float horizontalNoise = sin(uv.y * 8.0 + dripTime * 0.5) * 0.3;
                
                // Combine distortions
                float totalDistortion = (verticalStreak + horizontalNoise) * distortionStrength * heightMask;
                
                // Apply distortion to UV coordinates
                vec2 distortedUV = uv;
                distortedUV.y += totalDistortion * 0.1;
                distortedUV.x += totalDistortion * 0.03;
                
                // Create flowing drip trails
                float dripTrail = smoothstep(0.3, 0.7, sin(uv.x * 12.0 + dripTime * 2.0));
                float dripMask = heightMask * dripTrail;
                
                // Sample textures with distortion
                vec4 baseColor = texture2D(baseTexture, uv);
                vec4 paintColor = texture2D(paintTexture, distortedUV);
                
                // Enhanced color shifting for magical melting effect
                vec3 colorShiftVec = vec3(
                    sin(dripTime * 0.7 + vWorldPosition.y * 2.0),
                    sin(dripTime * 0.5 + vWorldPosition.y * 2.0 + 2.0),
                    sin(dripTime * 0.9 + vWorldPosition.y * 2.0 + 4.0)
                ) * colorShift * 0.15;
                
                paintColor.rgb += colorShiftVec;
                
                // Create paint streaking effect
                float paintStreak = smoothstep(0.0, 0.8, abs(totalDistortion)) * dripMask;
                vec4 streakColor = paintColor * vec4(1.2, 1.1, 1.0, 1.0); // Slightly lighter for streaks
                
                // Blend layers
                vec4 finalColor = mix(baseColor, paintColor, paintColor.a * 0.6);
                finalColor = mix(finalColor, streakColor, paintStreak * 0.4);
                
                // Add dripping transparency and edge effects
                float edgeFade = smoothstep(0.0, 0.2, abs(sin(uv.x * 30.0 + dripTime * 3.0))) * heightMask;
                finalColor.a *= (1.0 - edgeFade * 0.3);
                
                // Enhance the dripping regions
                float dripAlpha = 1.0 - smoothstep(0.0, 1.0, abs(totalDistortion) * 15.0);
                finalColor.a *= mix(0.7, 1.0, dripAlpha);
                
                gl_FragColor = finalColor;
            }
        `;
    }
    
    setupLighting() {
        // Ambient light for mystical atmosphere
        const ambientLight = new THREE.AmbientLight(0x4a3728, 0.4);
        this.scene.add(ambientLight);
        
        // Warm directional light from above
        const directionalLight = new THREE.DirectionalLight(0xffd8a8, 0.8);
        directionalLight.position.set(0, 10, 0);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Colored point lights for magical effect
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1];
        for (let i = 0; i < 3; i++) {
            const light = new THREE.PointLight(colors[i], 0.3, 20);
            const angle = (i / 3) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 8, 3, Math.sin(angle) * 8);
            this.scene.add(light);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    updateMovement() {
        if (!this.controls.isLocked) return;
        
        const delta = this.clock.getDelta();
        const moveSpeed = 5.0;
        
        this.moveVector.set(0, 0, 0);
        
        if (this.keys['KeyW']) this.moveVector.z -= 1;
        if (this.keys['KeyS']) this.moveVector.z += 1;
        if (this.keys['KeyA']) this.moveVector.x -= 1;
        if (this.keys['KeyD']) this.moveVector.x += 1;
        
        if (this.moveVector.length() > 0) {
            this.moveVector.normalize();
            this.moveVector.multiplyScalar(moveSpeed * delta);
            this.controls.moveRight(this.moveVector.x);
            this.controls.moveForward(this.moveVector.z);
        }
    }
    
    updatePaintDroplets() {
        const time = this.clock.getElapsedTime();
        
        this.paintDroplets.forEach((droplet) => {
            droplet.position.y -= droplet.userData.fallSpeed * 0.016;
            
            // Add some horizontal movement
            droplet.position.x += Math.sin(time + droplet.userData.angle) * 0.002;
            droplet.position.z += Math.cos(time + droplet.userData.angle) * 0.002;
            
            // Reset when droplet hits the floor
            if (droplet.position.y < -6) {
                droplet.position.y = droplet.userData.initialY;
                const angle = Math.random() * Math.PI * 2;
                const radius = 14.5;
                droplet.position.x = Math.cos(angle) * radius;
                droplet.position.z = Math.sin(angle) * radius;
                droplet.userData.angle = angle;
            }
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = this.clock.getElapsedTime();
        
        // Update shader uniforms with enhanced timing
        if (this.libraryMaterial) {
            this.libraryMaterial.uniforms.time.value = time;
            this.libraryMaterial.uniforms.dripSpeed.value = 0.8 + Math.sin(time * 0.2) * 0.3;
            this.libraryMaterial.uniforms.distortionStrength.value = 0.4 + Math.sin(time * 0.15) * 0.2;
        }
        
        this.updateMovement();
        this.updatePaintDroplets();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the enchanted library
new EnchantedLibrary();
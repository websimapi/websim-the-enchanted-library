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
    
    createLibraryEnvironment() {
        // Create the main cylindrical library space
        const libraryGeometry = new THREE.CylinderGeometry(15, 15, 12, 32, 1, true);
        
        // Create the dripping paint material
        const libraryMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                baseTexture: { value: this.createLibraryTexture() },
                paintTexture: { value: this.createPaintTexture() },
                dripIntensity: { value: 0.8 },
                colorShift: { value: 0.3 }
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
            uniform float time;
            uniform float dripIntensity;
            
            void main() {
                vUv = uv;
                
                vec3 pos = position;
                
                // Create dripping effect on upper portions
                if (pos.y > 0.0) {
                    float dripAmount = sin(time * 0.8 + pos.x * 10.0) * 0.1 * dripIntensity;
                    pos.y += dripAmount * (pos.y / 6.0);
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
            
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            
            void main() {
                vec2 uv = vUv;
                
                // Create flowing drip effect
                float dripOffset = sin(time * 1.2 + vWorldPosition.x * 5.0) * 0.02 * dripIntensity;
                uv.y += dripOffset;
                
                // Vertical stretching for drips
                float stretch = 1.0 + sin(time * 0.6 + vWorldPosition.y * 2.0) * 0.3 * dripIntensity;
                uv.y *= stretch;
                
                vec4 baseColor = texture2D(baseTexture, uv);
                vec4 paintColor = texture2D(paintTexture, uv);
                
                // Color shifting for magical effect
                paintColor.rgb += sin(time * 0.5 + vWorldPosition.y) * colorShift * 0.2;
                
                // Blend paint over base
                vec4 finalColor = mix(baseColor, paintColor, paintColor.a * 0.8);
                
                // Add dripping transparency
                float dripAlpha = 1.0 - smoothstep(0.0, 1.0, abs(dripOffset) * 20.0);
                finalColor.a *= dripAlpha;
                
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
        
        // Update shader uniforms
        if (this.libraryMaterial) {
            this.libraryMaterial.uniforms.time.value = time;
        }
        
        this.updateMovement();
        this.updatePaintDroplets();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the enchanted library
new EnchantedLibrary();


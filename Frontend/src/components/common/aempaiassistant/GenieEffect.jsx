import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
uniform vec4 u_start_rect;
uniform vec4 u_target_rect;
uniform float u_progress;
uniform float u_resolution_y;

varying vec2 vUv;

void main() {
    vUv = uv;
    
    // UV space: 0,0 is bottom-left, 1,1 is top-right
    // But in our Ortho camera, Y goes down, so actually plane generation might map UVs differently.
    // ThreeJS PlaneGeometry: by default, y is up. uv.y=1 is top, uv.y=0 is bottom.
    // However, our coordinates are in screen space where Y=0 is top.
    
    vec2 srcSize = u_start_rect.zw;
    vec2 srcPos = u_start_rect.xy;
    vec2 dstSize = u_target_rect.zw;
    vec2 dstPos = u_target_rect.xy;

    // Map vertex from [-0.5, 0.5] to actual screen pixels for start and end
    vec2 start_xy = srcPos + (position.xy + vec2(0.5)) * srcSize;
    vec2 target_xy = dstPos + (position.xy + vec2(0.5)) * dstSize;
    
    // Invert Y because PlaneGeometry +y is up, but DOM +y is down.
    // Actually, setting position is easier if we just use uv.
    start_xy = srcPos + vec2(uv.x, 1.0 - uv.y) * srcSize;
    target_xy = dstPos + vec2(uv.x, 1.0 - uv.y) * dstSize;

    // Genie curve logic
    // we want a non-linear progress based on how far we are vertically.
    // The bottom of the window goes in first.
    // 'uv.y' is 0 at the bottom of the plane, and 1 at the top of the plane.
    // But since we mapped 1.0 - uv.y to Y, uv.y=0 is the bottom edge of the DOM rect.
    
    // Smoothstep progress
    float p = smoothstep(0.0, 1.0, u_progress);
    
    // Vertical factor: bottom bends more/sooner than top.
    // We modify the horizontal bend based on vertical position and progress.
    float distanceY = abs(target_xy.y - start_xy.y);
    float dy = mix(start_xy.y, target_xy.y, p);
    
    // For x, we want it to suck in to the target center.
    // The closer the y is to the target y, the more it compresses.
    float bendFactor = pow(p, mix(1.0, 3.0, uv.y)); // Bottom (uv.y=0) gets linear, top gets delayed
    
    // Mix position
    vec2 final_xy = mix(start_xy, target_xy, bendFactor);
    final_xy.y = dy;
    
    // Add a sine curve for the "swoosh"
    float swoosh = sin(p * 3.14159) * (1.0 - uv.y) * 100.0;
    // We bend it towards the target's X side depending on which way it's going.
    float xDir = sign(dstPos.x - srcPos.x);
    final_xy.x += swoosh * xDir * (1.0 - p); // Add slight horizontal bulge

    // final_xy is in screen pixel coordinates (Y down).
    // Convert to webgl normalized device coordinates [-1, 1]
    
    // Ortho camera left=0, right=viewportWidth, top=0, bottom=viewportHeight
    // So final_xy is already in the camera's local space.
    // We output local space, projection matrix handles the rest.
    vec4 mvPosition = modelViewMatrix * vec4(final_xy, 0.0, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D u_texture;
uniform float u_progress;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(u_texture, vUv);
    
    // Subtle darkening near the end for depth
    float p = smoothstep(0.0, 1.0, u_progress);
    color.rgb *= mix(1.0, 0.86, p);
    
    gl_FragColor = color;
}
`;

const GenieEffect = ({ 
  textureSource, 
  startRect, 
  targetRect, 
  duration = 600, 
  reverse = false, 
  onComplete 
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!textureSource || !startRect || !targetRect || !containerRef.current) return;

    // Setup Three.js
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    
    // Orthographic camera mapping exactly to screen pixels. Top-left is (0,0)
    const camera = new THREE.OrthographicCamera(0, width, 0, height, -100, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    containerRef.current.appendChild(renderer.domElement);

    // Create texture from the canvas (textureSource)
    const texture = new THREE.CanvasTexture(textureSource);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // Enough segments for smooth curvature without overloading GPU
    const geometry = new THREE.PlaneGeometry(1, 1, 44, 44);
    
    // Convert DOMRects to vec4(x, y, width, height)
    const u_start_rect = new THREE.Vector4(startRect.x, startRect.y, startRect.width, startRect.height);
    const u_target_rect = new THREE.Vector4(targetRect.x, targetRect.y, targetRect.width, targetRect.height);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_texture: { value: texture },
        u_start_rect: { value: reverse ? u_target_rect : u_start_rect },
        u_target_rect: { value: reverse ? u_start_rect : u_target_rect },
        u_progress: { value: 0.0 },
        u_resolution_y: { value: height },
      },
      transparent: true,
      depthWrite: false,
    });

    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);

    // Animation Loop
    let startTime = null;
    let animationFrameId;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      let progress = elapsed / duration;
      
      if (progress > 1.0) progress = 1.0;

      // Smoother step easing
      const easedProgress = progress * progress * (3.0 - 2.0 * progress);

      material.uniforms.u_progress.value = easedProgress;
      
      renderer.render(scene, camera);

      if (progress < 1.0) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      if (containerRef.current && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [textureSource, startRect, targetRect, duration, reverse, onComplete]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-10000 pointer-events-none" 
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default GenieEffect;

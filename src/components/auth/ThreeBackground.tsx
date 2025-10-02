import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ThreeBackgroundProps {
  className?: string
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const animationIdRef = useRef<number>()

  useEffect(() => {
    if (!mountRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.z = 50

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setClearColor(0xffffff, 0) // Transparent background
    rendererRef.current = renderer
    
    mountRef.current.appendChild(renderer.domElement)

    // Create floating geometric shapes
    const shapes: THREE.Mesh[] = []
    const materials = [
      new THREE.MeshBasicMaterial({ 
        color: 0x2563eb, 
        transparent: true, 
        opacity: 0.6,
        wireframe: false
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x3b82f6, 
        transparent: true, 
        opacity: 0.4,
        wireframe: true
      }),
      new THREE.MeshBasicMaterial({ 
        color: 0x1d4ed8, 
        transparent: true, 
        opacity: 0.8,
        wireframe: false
      })
    ]

    // Create various geometric shapes
    for (let i = 0; i < 50; i++) {
      let geometry: THREE.BufferGeometry

      const shapeType = Math.floor(Math.random() * 4)
      switch (shapeType) {
        case 0:
          geometry = new THREE.BoxGeometry(
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5,
            Math.random() * 2 + 0.5
          )
          break
        case 1:
          geometry = new THREE.SphereGeometry(Math.random() * 1.5 + 0.5, 8, 6)
          break
        case 2:
          geometry = new THREE.ConeGeometry(Math.random() * 1 + 0.5, Math.random() * 2 + 1, 6)
          break
        default:
          geometry = new THREE.OctahedronGeometry(Math.random() * 1.5 + 0.5)
      }

      const material = materials[Math.floor(Math.random() * materials.length)]
      const shape = new THREE.Mesh(geometry, material)

      // Random positioning
      shape.position.x = (Math.random() - 0.5) * 100
      shape.position.y = (Math.random() - 0.5) * 100
      shape.position.z = (Math.random() - 0.5) * 100

      // Random rotation
      shape.rotation.x = Math.random() * Math.PI
      shape.rotation.y = Math.random() * Math.PI
      shape.rotation.z = Math.random() * Math.PI

      // Store initial position and add random motion properties
      ;(shape as any).initialPosition = shape.position.clone()
      ;(shape as any).rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      }
      ;(shape as any).floatSpeed = Math.random() * 0.01 + 0.005
      ;(shape as any).floatOffset = Math.random() * Math.PI * 2

      shapes.push(shape)
      scene.add(shape)
    }

    // Add ambient lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 50, 50)
    scene.add(directionalLight)

    // Animation loop
    let time = 0
    const animate = () => {
      time += 0.01

      shapes.forEach((shape, index) => {
        // Rotate shapes
        shape.rotation.x += (shape as any).rotationSpeed.x
        shape.rotation.y += (shape as any).rotationSpeed.y
        shape.rotation.z += (shape as any).rotationSpeed.z

        // Float up and down
        const floatOffset = (shape as any).floatOffset
        const floatSpeed = (shape as any).floatSpeed
        shape.position.y = (shape as any).initialPosition.y + Math.sin(time * floatSpeed + floatOffset) * 3

        // Slight horizontal drift
        shape.position.x = (shape as any).initialPosition.x + Math.cos(time * floatSpeed * 0.7 + floatOffset) * 2
      })

      // Rotate camera slowly around the scene
      camera.position.x = Math.cos(time * 0.1) * 5
      camera.position.y = Math.sin(time * 0.15) * 3
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      animationIdRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight

      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      window.removeEventListener('resize', handleResize)
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      
      // Dispose of geometries and materials
      shapes.forEach(shape => {
        shape.geometry.dispose()
        if (Array.isArray(shape.material)) {
          shape.material.forEach(material => material.dispose())
        } else {
          shape.material.dispose()
        }
      })
      
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className={`fixed inset-0 ${className}`} />
}

export default ThreeBackground
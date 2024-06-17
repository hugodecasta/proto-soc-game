import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { EventHandler, bodyAdd, div } from './vanille/components.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { SAOPass } from 'three/addons/postprocessing/SAOPass.js'
// import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'

import { DATABASE } from './vanille/db_sytem/database.js'

THREE.Object3D.prototype.addEventListener = function (evt_name, func) {
    const on_name = 'on' + evt_name
    if (!this[on_name]) this[on_name] = []
    this[on_name].push(func)
}

THREE.Object3D.prototype.clearEvents = function (evt_name) {
    const on_name = 'on' + evt_name
    if (this[on_name]) this[on_name] = []
    this.children.forEach(c => c.clearEvents(evt_name))
}

THREE.Object3D.prototype.setPointerEvents = function (is_pointer_event, forced) {
    if (this.userData.hide_from_intersect_forced) return
    this.userData.hide_from_intersect = typeof is_pointer_event == 'function' ? is_pointer_event(this) : !is_pointer_event
    this.userData.hide_from_intersect_forced = forced
    this.children.forEach(c => c.setPointerEvents(is_pointer_event))
}

// const old_mat_conner = THREE.Material.prototype.clone
// THREE.Material.prototype.clone = function (allow_switcher, ...args) {
//     const switcher = this.switcher
//     const cloned = old_mat_conner.call(this, ...args)
//     if (switcher && allow_switcher) cloned.switcher = switcher
//     return cloned
// }

// const old_obj_clonner = THREE.Object3D.prototype.clone
// THREE.Object3D.prototype.clone = function (...args) {
//     const is_physical = this.is_physical
//     const cloned = old_obj_clonner.call(this, ...args)
//     if (is_physical) cloned.is_physical = is_physical
//     return cloned
// }

THREE.Object3D.prototype.pour_data = function () {
    for (const attr in this.userData) {
        this[attr] = this.userData[attr]
    }
    this.children.forEach(ch => ch.pour_data())
}

// const old_adder = THREE.Object3D.prototype.add
// THREE.Object3D.prototype.add = function (who) {
//     const res = old_adder.call(this, who)
//     if (this.userData.switchers)
//         for (const attr in this.userData) {
//             this[attr] = this.userData[attr]
//         }
//     return res
// }

// const old_add = THREE.Object3D.prototype.add
// THREE.Object3D.prototype.add = function (ob) {
//     const data = old_add.call(this, ob)
//     ob.setPointerEvents(!this.hide_from_intersect)
//     return data
// }

const cursor_info = div()
cursor_info.set_style({
    position: 'fixed',
    padding: '2px',
    background: '#fff',
    zIndex: 1000,
    pointerEvents: 'none',
    fontSize: '12px',
    userSelect: 'none',
})
bodyAdd(cursor_info)
export function set_cursor_infos(text) {
    if (!text) return cursor_info.style.display = 'none'
    cursor_info.style.display = 'block'
    cursor_info.innerHTML = text
}
set_cursor_infos(null)

const caps_infos = div()
caps_infos.set_style({
    position: 'fixed',
    padding: '2px',
    background: '#fff',
    zIndex: 1000,
    pointerEvents: 'none',
    fontSize: '12px',
    userSelect: 'none',
    bottom: '5px',
    right: '5px',
})
bodyAdd(caps_infos)
export function set_caps_infos(text) {
    if (!text) return caps_infos.style.display = 'none'
    caps_infos.style.display = 'block'
    caps_infos.innerHTML = text
}
set_caps_infos(null)

export class THREE_VIEWPORT {

    camera = undefined
    render_funcs = []

    constructor(fov = 75, resolution = 1, intersect_through = false) {

        const viewer = div().set_style({
            position: 'fixed',
            top: '0px',
            left: '0px',
            zIndex: '-10',
            width: window.innerWidth + 'px',
            height: window.innerHeight + 'px'
        })

        bodyAdd(viewer)

        const scene = new THREE.Scene()

        const world_group = new THREE.Group()
        this.world_group = world_group
        this.world_group.rotateX(-Math.PI / 2)
        scene.add(this.world_group)

        const helper_group = new THREE.Group()
        this.helper_group = helper_group
        scene.add(this.helper_group)

        let aspect = window.innerWidth / window.innerHeight
        aspect *= 0.9

        const camera = new THREE.PerspectiveCamera(
            fov,
            aspect,
            0.1, 1000
        )
        this.camera = camera


        this.scene = scene

        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()

        function intersect(obj, func_name, evt, from_top = false) {
            const final_func_name = 'on' + func_name
            let stop = false
            evt.preventDefault = () => stop = true
            if (!evt.object && func_name) {
                evt.object = obj
            }
            if (obj[final_func_name]) obj[final_func_name].forEach(f => f(evt))
            if (stop) return
            if (from_top) {
                obj.children?.forEach(c => intersect(c, func_name, evt, from_top))
            }
            else {
                if (obj.parent && obj.parent != scene) {
                    intersect(obj.parent, func_name, evt)
                }
            }
        }

        function trigger_raycast(evt, func_name = null) {
            const { clientX, clientY } = evt
            pointer.x = (clientX / window.innerWidth) * 2 - 1
            pointer.y = - (clientY / window.innerHeight) * 2 + 1
            raycaster.setFromCamera(pointer, camera)
            const intersects = raycaster.intersectObjects(scene.children)
            let elm = null
            let nb = 0
            const stud_meshs = []
            for (elm of intersects.filter(i => i.object.userData.hide_from_intersect !== true).sort((a, b) => {
                b.distance - a.distance
            })) {
                const { x, y, z } = elm.point
                elm.point = new THREE.Vector3(x, -z - 5, y)
                evt.hit = elm
                evt.nb = nb
                const obj = elm.object
                if (stud_meshs.includes(stud_meshs)) continue
                stud_meshs.push(obj)
                if ((!obj || obj == world_group) && func_name) {
                    scene.children.forEach(c => intersect(c, 'scene' + func_name, evt, true))
                }
                else {
                    if (func_name) intersect(obj, func_name, evt)
                }
                nb++
                if (!intersect_through) break
            }
            return elm?.object

        }

        let down_pos = null
        viewer.addEventListener('mousedown', (evt) => {
            trigger_raycast(evt, 'mousedown')
            down_pos = [evt.clientX, evt.clientY]
        })
        viewer.addEventListener('contextmenu', (evt) => {
            evt.preventDefault()
        })
        viewer.addEventListener('mouseup', (evt) => {
            trigger_raycast(evt, 'mouseup')
            const poser = down_pos
            down_pos = null
            if (poser) {
                const [x1, y1] = poser
                const dist = Math.sqrt(Math.pow(x1 - evt.clientX, 2) + Math.pow(y1 - evt.clientY, 2))
                if (dist > 15) return
            }
            trigger_raycast(evt, 'click', evt.button)
        })
        let last_focus = null
        viewer.addEventListener('mousemove', (evt) => {
            trigger_raycast(evt, 'mousemove')
            const this_focus = trigger_raycast(evt)
            if (this_focus != last_focus) {
                if (last_focus) intersect(last_focus, 'blur', JSON.parse(JSON.stringify(evt)))
                if (this_focus) intersect(this_focus, 'focus', JSON.parse(JSON.stringify(evt)))
                last_focus = this_focus
            }
            cursor_info.set_style({
                top: (evt.clientY + 10) + 'px',
                left: (evt.clientX + 10) + 'px',
            })
        })

        window.camera = camera

        const renderer = new THREE.WebGLRenderer({ antialias: true, })
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        // renderer.shadowMap.type = THREE.VSMShadowMap
        renderer.setSize(window.innerWidth * resolution, window.innerHeight * resolution)
        viewer.add(renderer.domElement)
        renderer.domElement.style.width = '100%'
        renderer.domElement.style.height = '100%'

        this.domElement = renderer.domElement

        const po = new THREE.Group()
        po.position.set(0, 0, 0)
        scene.add(po)
        this.po = po

        camera.position.set(0, 0, 0)

        // this.camera = po

        const controls = new OrbitControls(camera, renderer.domElement)
        this.controls = controls
        controls.enabled = true

        const composer = new EffectComposer(renderer)

        const renderScene = new RenderPass(scene, camera)
        composer.addPass(renderScene)

        const ssrPass = new SSRPass({ renderer, scene, camera, selects: [] })
        ssrPass.maxDistance = 0.2
        this.ssrPass = ssrPass
        // composer.addPass(ssrPass)

        // const saoPass = new SAOPass(scene, camera, {
        //     saoBias: 0.1
        // })
        // composer.addPass(saoPass)

        // const gtaoPass = new GTAOPass(scene, camera, width, height)
        // gtaoPass.output = GTAOPass.OUTPUT.Denoise

        const bokehPass = new BokehPass(scene, camera, {
            focus: 0,
            aperture: 0.01,
            maxblur: 0.01
        })
        bokehPass.opacity = 0.5
        window.dof = bokehPass
        // composer.addPass(bokehPass)

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), .2, .3, .6)
        bloomPass.compositeMaterial.transparent = true
        bloomPass.compositeMaterial.opacity = 0.5
        composer.addPass(bloomPass)


        const outputPass = new OutputPass()
        composer.addPass(outputPass)

        // window.set_bloom = (i, r, t, o) => {
        //     bloomPass.strength = i
        //     bloomPass.radius = r
        //     bloomPass.threshold = t
        //     bloomPass.compositeMaterial.opacity = o
        // }

        let play = true

        this.bloom = true

        const render = () => {
            if (!play) return
            if (this.env_sphere) {
                this.env_sphere.position.copy(camera.getWorldPosition(new THREE.Vector3()))
            }
            if (controls.enabled) controls.update()
            this.render_funcs.forEach(f => f())
            if (this.bloom) composer.render()
            else renderer.render(scene, camera)

        }

        const animate = () => {
            requestAnimationFrame(animate)
            render()
        }
        animate()

        // const light = new THREE.DirectionalLight(0xffffff, 2)
        // light.position.set(10, 50, 10)
        // const light2 = new THREE.DirectionalLight(0xffffff, 1)
        // light2.position.set(-10, -10, -10)
        // scene.add(light)
        // scene.add(light2)

    }

    setup_save_cam_pos(database_name, init_campos = { x: 10, y: 10, z: 10 }) {
        const view_database = new DATABASE(database_name, {
            camera: {
                position: init_campos,
                target: { x: 0, y: 0, z: 0 },
            }
        })

        view_database.add_before_save((view_object) => {
            view_object.camera = {
                position: this.camera.position.clone(),
                target: this.controls.target.clone(),
            }
        })

        this.camera.position.set(...Object.values(view_database.object.camera.position))
        this.controls.target = new THREE.Vector3(...Object.values(view_database.object.camera.target))
    }

    init_lock_view() {
    }

    add(obj) {
        this.world_group.add(obj)
        return obj
    }

    remove(obj) {
        this.world_group.remove(obj)
        return obj
    }

    create_environnement(texture) {

        const env_sphere = new THREE.Mesh(
            new THREE.SphereGeometry(500, 30, 30),
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                lightMap: new THREE.TextureLoader().load(texture),
                lightMapIntensity: 6.5
            })
        )

        const sun_anchor = new THREE.Group()
        env_sphere.add(sun_anchor)
        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(20, 30, 30),
            new THREE.MeshBasicMaterial({
                color: 0xffefee,
                lightMap: new THREE.TextureLoader().load('/sun.png'),
                lightMapIntensity: 100
            })
        )

        sun.position.z = -400
        sun.position.y = 15
        sun_anchor.add(sun)
        sun_anchor.rotation.y = -Math.PI / 4

        this.scene.add(env_sphere)
        this.env_sphere = env_sphere


        const sun_light = new THREE.DirectionalLight(0xffffff, 5)
        sun_light.castShadow = true
        sun_light.shadow.mapSize.width = 256 * 4
        sun_light.shadow.mapSize.height = 256 * 4

        sun_light.shadow.camera.near = 300
        sun_light.shadow.camera.far = 700

        const sider = 30
        sun_light.shadow.camera.right = sider
        sun_light.shadow.camera.top = sider
        sun_light.shadow.camera.left = -sider
        sun_light.shadow.camera.bottom = -sider

        sun_light.shadow.radius = 4
        sun_light.shadow.blurSamples = 10

        window.shadow = sun_light.shadow
        window.sun_light = sun_light

        // const he = new THREE.DirectionalLightHelper(sun_light)
        // this.scene.add(he)

        // setTimeout(() => sun_light.position.copy(sun.getWorldPosition(new THREE.Vector3())))
        sun.add(sun_light)
        sun_light.position.set(0, 0, 0)
        sun_light.target.position.set(0, 0, 0)
        env_sphere.add(sun_light.target)

        // this.scene.add(sun_light)

        return env_sphere

    }
}

function xtr_func(func) {
    if (typeof func == 'function') return func()
    return func
}

export function focus_mat_change(obj, focus_mat, focus_text, other_objects = []) {

    let normal_material = null

    function set_obj_material(obj, new_material, record_normal) {
        if (!new_material) return
        if (record_normal) normal_material = obj.material?.clone()
        obj.material = new_material.clone()
        obj.children?.forEach(o => set_obj_material(o, new_material, record_normal))
    }

    function set_all_obj_material(new_material, record_normal) {
        [obj, ...xtr_func(other_objects)].forEach(o => set_obj_material(o, new_material, record_normal))

    }


    obj.addEventListener('focus', () => {
        const new_material = xtr_func(focus_mat)
        set_all_obj_material(new_material, true)
        const ftext = xtr_func(focus_text)
        set_cursor_infos(ftext)
    })

    obj.addEventListener('blur', () => {
        set_all_obj_material(normal_material, false)
        set_cursor_infos(null)
    })
}

export function set_focus_text(obj, focus_text) {

    obj.addEventListener('focus', () => {
        const ftext = xtr_func(focus_text)
        set_cursor_infos(ftext)
    })

    obj.addEventListener('blur', () => {
        set_cursor_infos(null)
    })
}

export class KEYSTATE extends EventHandler {

    state = {}
    current_pressed = {}
    current_code_pressed = {}

    constructor() {
        super()
        window.addEventListener('keydown', (evt) => {
            this.state = evt
            this.current_pressed[evt.key] = true
            this.current_code_pressed[evt.code] = true
            this.trigger_event('keydown', evt, this.current_pressed)
        })
        window.addEventListener('keyup', (evt) => {
            this.state = {}
            delete this.current_pressed[evt.key]
            delete this.current_code_pressed[evt.code]
            this.trigger_event('keyup', evt, this.current_pressed)
        })
    }

    confront(key_code) {
        return key_code in this.current_code_pressed
    }

    add_state_caps_text(state_condition, text) {
        this.addEventListener('keydown', () => {
            if (state_condition(this.state)) set_caps_infos(xtr_func(text))
        })
        this.addEventListener('keyup', () => {
            set_caps_infos(null)
        })
    }

}

export const main_key_state = new KEYSTATE()

export const main_data_accu = {}

const gp_btn_map = [
    'A', 'B', 'X', 'Y',
    'LB', 'RB', 'LT', 'RT',
    'Back', 'Start',
    'LAxe', 'RAxe',
    'Up', 'Down', 'Left', 'Right'
]
const gp_axe_map = ['LAxeX', 'LAxeY', 'RAxeX', 'RAxeY']

class PADSTATE extends EventHandler {

    current_pressed = {}
    current_values = {}

    axes_threashold = {
        'LAxeX': 0,
        'LAxeY': 0,
        'RAxeX': 0,
        'RAxeY': 0,
    }

    set_axe_threashold(name, threashold) {
        this.axes_threashold[name] = threashold
    }

    set_full_axe_threashold(axe_name, threashold) {
        this.set_axe_threashold(axe_name + 'X', threashold)
        this.set_axe_threashold(axe_name + 'Y', threashold)
    }

    set_axes_threashold(threashold) {
        this.set_full_axe_threashold('LAxe', threashold)
        this.set_full_axe_threashold('RAxe', threashold)
    }

    value(key) {
        return this.current_values[key] ?? 0
    }

    constructor() {
        super()

        let gamepad_index = null
        window.addEventListener("gamepadconnected", (e) => {
            gamepad_index = e.gamepad.index
        })
        window.addEventListener("gamepaddisconnected", (e) => {
            gamepad_index = null
        })

        setInterval(() => {
            if (gamepad_index == null) return
            const gamepad = navigator.getGamepads()[gamepad_index]
            const buttons = Object.fromEntries(gp_btn_map.map((btn_name, id) => {
                return [btn_name, gamepad.buttons[id].value]
            }))
            const axes = Object.fromEntries(gp_axe_map.map((axe_name, id) => {
                return [
                    axe_name,
                    (Math.abs(gamepad.axes[id]) > this.axes_threashold[axe_name] ? gamepad.axes[id] : 0)
                    * (axe_name.includes('Y') ? -1 : 1)
                ]
            }))
            const current_values = { ...buttons, ...axes }
            const current_pressed = Object.fromEntries(
                Object.keys(current_values).filter(k => current_values[k] != 0)
                    .map(k => [k, true])
            )
            for (const key in current_values) {
                if (this.current_values[key] == null) continue
                if (this.current_values[key] != current_values[key])
                    this.trigger_event('change', key, current_values[key])
            }
            this.current_values = current_values
            this.current_pressed = current_pressed

        }, 10)
    }

}

export const main_pad_state = new PADSTATE()

export function find_scene(object) {
    if (!object) return null
    if (object.type == 'Scene') return object
    return find_scene(object.parent)
}

export function iter_to_type(object, type, action, i = 0) {
    if (object.type == type || !type) action(object, i)
    object.children.forEach((ch, i) => iter_to_type(ch, type, action, i))
}

export function iter_to_meshes(object, action) {
    iter_to_type(object, 'Mesh', action)
}


export function toScreenPosition(obj, camera) {
    const vector = new THREE.Vector3()

    const widthHalf = window.innerWidth * 0.5
    const heightHalf = window.innerHeight * 0.5

    obj.updateMatrixWorld()
    vector.setFromMatrixPosition(obj.matrixWorld)
    vector.project(camera)

    vector.x = (vector.x * widthHalf) + widthHalf
    vector.y = - (vector.y * heightHalf) + heightHalf

    return {
        x: vector.x,
        y: vector.y
    }

}

export function find_next(source_object, condition) {
    if (condition(source_object)) return source_object
    return source_object.children.find(ch => find_next(ch, condition))
}

export function find_all(source_object, condition) {
    const found = []
    if (condition(source_object)) found.push(source_object)
    const sub_found = source_object.children.map(ch => find_all(ch, condition)).reduce((a, b) => a.concat(b), [])
    found.push(...sub_found)
    return found
}
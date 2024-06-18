import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import * as THREE from 'three'
import { EventHandler, button, div, h1, listen_to, popup_pop } from "./vanille/components.js"
import { iter_to_type, THREE_VIEWPORT } from './THREE_VIEWPORT.js'

window.adder = 1
// ---------------------------------------------------------------------------------- PLANCH OBJECT

let global_planche = null

export class PLANCHE3D extends EventHandler {

    constructor() {
        super()

        global_planche = this
        this.id_map = {}
        this.users = {}

        const vp3d = new THREE_VIEWPORT(75, 1, true)
        this.vp3d = vp3d
        vp3d.bloom = true
        vp3d.setup_save_cam_pos('soc_game_cam')

        vp3d.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5))

        const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
        directionalLight.position.set(50, 50, 100)
        vp3d.add(directionalLight)
        directionalLight.castShadow = true

        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048

        directionalLight.shadow.camera.left = -50
        directionalLight.shadow.camera.right = 50
        directionalLight.shadow.camera.top = 50
        directionalLight.shadow.camera.bottom = -50

        directionalLight.shadow.camera.near = 0.5
        directionalLight.shadow.camera.far = 1000

        directionalLight.shadow.bias = -0.0001
        directionalLight.shadow.radius = 1

        let in_control = false

        window.addEventListener('keydown', (evt) => {
            if (evt.ctrlKey) {
                vp3d.controls.enabled = false
                in_control = true
                this.trigger_event('in_control')
            }
        })
        window.addEventListener('keyup', (evt) => {
            if (!evt.ctrlKey) {
                vp3d.controls.enabled = true
                in_control = false
                this.trigger_event('out_control')
            }
        })

        return new Promise(async ok => {
            const planche = await load_planche()
            vp3d.add(planche)
            ok(this)
        })

    }

    get_map() {
        return Object.fromEntries(Object.entries(this.id_map).map((id, obj) => ({
            id,
            position: obj.position,
            rotation: obj.rotation
        })))
    }

    update_user(user, color, x, y, show, camera_data) {
        if (!this.users[user]) {

            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5,
                emissive: new THREE.Color(color),
                emissiveIntensity: 10
            })
            const tube_h = 1000
            const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, tube_h, tube_h, 2), material)
            tube.rotation.x = Math.PI / 2
            tube.position.z = tube_h / 2
            const group = new THREE.Group()
            group.add(tube)
            this.vp3d.add(group)
            iter_to_type(group, 'Mesh', (m) => m.setPointerEvents(false))

            const user_cam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
            const cam_nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1), material)
            user_cam.add(cam_nose)
            cam_nose.position.set(0, 0, 1)
            this.vp3d.add(user_cam)
            iter_to_type(user_cam, 'Mesh', (m) => m.setPointerEvents(false))

            this.users[user] = {
                data: {
                    user,
                    color,
                },
                objs: {
                    tube: group,
                    cam: user_cam
                }
            }
        }

        const { tube, cam } = this.users[user].objs

        if (x) tube.position.x = x
        if (y) tube.position.y = y
        if (show != null) tube.visible = show

        if (camera_data) {
            const { cam_pos, tar_pos } = camera_data

            cam.position.x = cam_pos.x
            cam.position.y = -cam_pos.z
            cam.position.z = cam_pos.y

            const target = new THREE.Vector3(tar_pos.x, -tar_pos.z, tar_pos.y)

            const direction = new THREE.Vector3()
            direction.subVectors(target, cam.position).normalize()


            const quaternion = new THREE.Quaternion()
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
            cam.quaternion.copy(quaternion)

            const euler = new THREE.Euler().setFromQuaternion(cam.quaternion)
            euler.z = 0
            cam.quaternion.setFromEuler(euler)

        }
    }

    remove_user(user) {
        for (const elm of Object.values(this.users[user].objs)) {
            this.vp3d.remove(elm)
        }
        delete this.users[user]
    }

}

// ---------------------------------------------------------------------------------- LOAD PLANCHE

let scene = null
let font = null

let decks = {}

function handle_deck(name, deck) {

    let cards = Object.keys(deck.cards).map(card => Array(deck.cards[card]).fill(0).map(() => card))
        .reduce((a, b) => a.concat(b), [])
    if (deck.shuffle) {
        cards = cards.sort(() => Math.random() - 0.5)
    }
    decks[name] = cards
}

export async function load_planche() {

    const decks_data = await (await fetch('decks.json')).json()
    Object.entries(decks_data).forEach((dat) => handle_deck(...dat))
    console.log(decks)

    return new Promise(ok => {
        const loader = new FontLoader()
        loader.load('font/helvetiker_regular.json', (loaded_font) => {
            font = loaded_font
            const loader = new GLTFLoader()
            loader.load('planche.glb',
                function (gltf) {
                    gltf.scene.position.y += 5
                    iter_to_type(gltf.scene, null, setup_game_ids)
                    iter_to_type(gltf.scene, 'Mesh', setup_mesh)
                    console.log(gltf.scene)
                    scene = gltf.scene
                    ok(gltf.scene)
                },
                null,
                function (error) {
                    console.log('An error happened', error)
                }
            )
        })
    })
}

// ---------------------------------------------------------------------------------- MESH EVENT SETUP

// ----------------------------------------------------------- DATA SETUP

let got_mesh = null
let is_rotate = null

let init_point = null
let init_obj_point = null
let init_angle = null

let init_rotation = null


window.addEventListener('mouseup', (evt) => {
    if (got_mesh) {
        global_planche.trigger_event('done', got_mesh.userData.game_id)
        global_planche.trigger_event('obj', {
            id: got_mesh.userData.game_id,
            position: got_mesh.position,
            rotation: got_mesh.rotation
        })
    }
    got_mesh = null
    init_angle = null
})

// ----------------------------------------------------------- MAP_MAKER

export const local_id_map = {}

function setup_game_ids(obj, i) {
    if (!obj.userData.game_id) {
        obj.userData.game_id = (obj.parent?.userData?.game_id ?? 'INI') + '_' + i
    }
    global_planche.id_map[obj.userData.game_id] = {
        position: obj.position,
        rotation: obj.rotation,
    }
}

// ----------------------------------------------------------- ENTRY POINT

function setup_mesh(mesh, i) {

    mesh.receiveShadow = true
    mesh.castShadow = true
    mesh.material.shadowSide = THREE.FrontSide

    if (mesh.userData.deck) {
        mesh.userData.nomove = true
        set_deck(mesh)
    }

    if (mesh.userData.planche) {
        mesh.userData.nomove = true
        set_planche(mesh)
    }

    if (!mesh.userData.nomove) {
        set_movable(mesh)
    }
}

// ----------------------------------------------------------- PLANCHE

function set_planche(mesh) {

    mesh.addEventListener('mousemove', (evt) => {

        if (!evt.ctrlKey) return

        global_planche.trigger_event('mouse', {
            x: evt.hit.point.x,
            y: evt.hit.point.y + 5
        })

        if (!got_mesh) return

        const diffx = evt.hit.point.x - init_point.x
        const diffy = evt.hit.point.y - init_point.y

        if (is_rotate) {

            const a = Math.atan2(
                evt.hit.point.x - got_mesh.position.x,
                evt.hit.point.y - got_mesh.position.y
            )

            const quaternion = new THREE.Quaternion()
            const angle = init_angle - a
            const axis = new THREE.Vector3(0, 0, 1)
            quaternion.setFromAxisAngle(axis, angle)
            got_mesh.quaternion.multiplyQuaternions(quaternion, init_rotation)

            iter_to_type(got_mesh, 'Mesh', (mesh) => {
                if (mesh.userData.norotation) {
                    const quaternion = new THREE.Quaternion()
                    const angle = init_angle - a
                    const axis = new THREE.Vector3(0, 1, 0)
                    quaternion.setFromAxisAngle(axis, -angle)
                    mesh.quaternion.multiplyQuaternions(quaternion, mesh.init_q)
                }
            })
        }
        else {
            got_mesh.position.x = init_obj_point.x + diffx
            got_mesh.position.y = init_obj_point.y + diffy
        }

        global_planche.trigger_event('obj', {
            id: got_mesh.userData.game_id,
            position: got_mesh.position,
            rotation: got_mesh.rotation
        })
    })
}

// ----------------------------------------------------------- MOVABLE

function set_movable(mesh) {
    mesh.addEventListener('mousedown', (evt) => {
        if (evt.nb == 0) {

            got_mesh = mesh

            while (got_mesh.parent.name != 'Scene') {
                got_mesh = got_mesh.parent
            }

            init_point = evt.hit.point.clone()

            init_obj_point = got_mesh.position.clone()
            init_rotation = got_mesh.quaternion.clone()

            is_rotate = evt.button == 2
            init_angle = Math.atan2(evt.hit.point.x - got_mesh.position.x, evt.hit.point.y - got_mesh.position.y)


            iter_to_type(got_mesh, 'Mesh', (mesh) => {
                if (mesh.userData.norotation) {
                    mesh.init_q = mesh.quaternion.clone()
                }
            })


            global_planche.trigger_event('moving', got_mesh.userData.game_id)
        }
    })
}

// ----------------------------------------------------------- DECK

function add_text_to_mesh(mesh, text, size, color = null, x = null, y = null, z = null) {
    const text_mesh = new THREE.Mesh(
        new TextGeometry(text, {
            font,
            size: size,
            height: 0.01,
            curveSegments: 1,
            bevelEnabled: false,
        }),
        new THREE.MeshBasicMaterial({ color: color ?? 0x000000 }),
    )
    text_mesh.geometry.computeBoundingBox()
    const centerOffset = -0.5 * (text_mesh.geometry.boundingBox.max.x - text_mesh.geometry.boundingBox.min.x)
    text_mesh.position.set(x ?? centerOffset, y ?? 0, z ?? 1)
    text_mesh.scale.set(1 / mesh.scale.x, 1 / mesh.scale.y, 1)
    mesh.add(text_mesh)
}

function chunkArray(array, n) {
    if (n <= 0) {
        throw new Error("n must be a positive integer")
    }
    const result = []
    for (let i = 0; i < array.length; i += n) {
        result.push(array.slice(i, i + n))
    }
    return result
}

const out_type = {
    ouvert: 1,
    cache: 2,
    remise_aleatoire: 3,
    remise_dessus: 3,
    remise_dessous: 3,
}

const table = {}

function set_deck(mesh) {

    mesh.material.transparent = true

    const deck_name = mesh.userData.deck

    // if (!decks[deck_name]) {
    //     mesh.parent.remove(mesh)
    //     return
    // }

    add_text_to_mesh(mesh, deck_name, 0.2)
    const deck = decks[deck_name]

    mesh.addEventListener('click', async (evt) => {
        if (!evt.nb == 0) return
        deck.name = deck_name
        const text = deck.pop().replace(/é/g, 'e')
        popup_carte(deck, text, null, mesh)
    })

    listen_to(() => deck, () => {
        mesh.castShadow = deck.length > 0
        mesh.material.opacity = deck.length > 0 ? 1 : 0.2
    })
}

function set_card_in(card, text, deck, position) {
    card?.parent.remove(card)
    deck.splice(position, 0, text)
}


async function popup_carte(deck, text, carte, from_mesh, alter_pos = true) {

    if (carte) {
        carte.parent.remove(carte)
        delete table[text]
    }

    const pop_data = div().add(
        h1('Carte ' + deck.name),
        text.replace(/\n/g, '</br>')
    )

    const out = await popup_pop(
        pop_data,
        () => { },
        (ender) => div('',
            button('dévoiler sur la table', () => ender(out_type.ouvert)),
            button('cacher sur la table', () => ender(out_type.cache)),
            button('remettre dans le paquet', () => ender(out_type.remise_aleatoire)),
            button('remettre sur le paquet', () => ender(out_type.remise_dessus)),
            button('remettre sous le paquet', () => ender(out_type.remise_dessous)),
        )
    )

    let front_text = 'hidden'

    if (out == out_type.ouvert) {
        front_text = text
    }

    if ([out_type.ouvert, out_type.cache].includes(out)) {
        table[text] = deck.name
        const new_carte = from_mesh.clone()

        if (carte) {
            new_carte.position.x = carte.position.x
            new_carte.position.y = carte.position.y
        }
        if (alter_pos) {
            new_carte.position.y -= 5
            new_carte.position.x += 0.1
        }

        new_carte.position.z = (Math.random()) * 0.1
        new_carte.scale.z /= 10

        new_carte.remove(new_carte.children.find(c => c.geometry.type == "TextGeometry"))

        scene.add(new_carte)
        console.log(new_carte)

        set_carte(new_carte, text, front_text, deck, from_mesh)
    }
    else {

        const position = {
            [out_type.remise_aleatoire]: () => Math.floor(Math.random() * deck.length),
            [out_type.remise_dessous]: () => deck.length,
            [out_type.remise_dessus]: () => 0,
        }

        set_card_in(null, text, deck, position)

    }
}

function set_carte(carte, text, front_text, deck, from_mesh) {

    carte.material = carte.material.clone()
    carte.material.opacity = 1

    add_text_to_mesh(carte, chunkArray(front_text.split(' '), 4).map(e => e.join(' ')).join('\n'), 0.1)
    add_text_to_mesh(carte, deck.name, 0.1, 0xaaaaaa, -0.9, 0.9, null)

    set_movable(carte)

    carte.addEventListener('click', async (evt) => {
        if (evt.nb == 0) return
        popup_carte(deck, text, carte, from_mesh, false)
    })
}
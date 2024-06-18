import { connect_session } from "./interconnect.js"
import { listen_to } from "./vanille/components.js"

export class INTER_GAME {

    constructor(session_code, welcome, on_welcome, goodbye, on_goodbye, data_handler) {

        return new Promise(async (ok) => {

            this.connected_sender = await connect_session(
                session_code,
                (journal_id, packet) => {
                    const { topic, data } = packet
                    if (topic == 'welcome') {
                        on_welcome(data)
                    }
                    else if (topic == 'goodbye') {
                        on_goodbye(data)
                    }
                    else {
                        data_handler(topic, data, journal_id)
                    }
                }
            )

            const welcome_data = welcome()
            this.send_data('welcome', welcome_data, 'welcome' + JSON.stringify(welcome_data) + Date.now())


            window.addEventListener('beforeunload', (e) => {
                e.preventDefault()
            })

            window.addEventListener('unload', (e) => {
                const goodbye_data = goodbye()
                this.send_data('goodbye', goodbye_data, 'goodbye' + JSON.stringify(goodbye_data) + Date.now())
            })

            ok(this)

        })
    }

    send_data(topic, data, journal_id = null) {
        journal_id ??= Math.random() * 10000000 + 'c' + Math.random() * 10000000
        this.connected_sender(journal_id, { topic, data })
    }


}
const socket = io('https://intersocket.hugocastaneda.fr')

export function connect_session(session_code, on_journal_data) {

    function session_topic(topic) {
        return 'session_' + session_code + '_' + topic
    }

    // ----------------------------------------------------------- ON DATA

    socket.on(session_topic('data'), ({ journal_id, data }) => {
        on_journal_data(journal_id, data)
    })

    // ----------------------------------------------------------- ON JOURNAL

    socket.on(session_topic('journal'), (journal) => {
        console.log('JOURNAL', journal)
        for (const journal_id in journal) {
            on_journal_data(journal_id, journal[journal_id])
        }
    })

    // ----------------------------------------------------------- SEND DATA

    function send_data(journal_id, data) {
        socket.emit(session_topic('data'), { journal_id, data })
    }

    // ----------------------------------------------------------- CONNECTE

    socket.emit('connect_session', session_code)
    socket.emit(session_topic('journal'))

    return new Promise((ok) => {
        socket.on(session_topic('connected'), () => ok(send_data))
    })

} 
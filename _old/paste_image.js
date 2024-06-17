export function setup_image_paste(on_div, action) {

    setTimeout(() => {
        window.addEventListener('paste', async (evt) => {
            const items = (evt.clipboardData || evt.originalEvent.clipboardData).items

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile()
                    const base64String = await readFileAsBase64(file)
                    action(base64String)
                }
            }
        })

        function readFileAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
        }
    }, 100)

}
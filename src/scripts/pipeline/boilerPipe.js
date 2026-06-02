self.onmessage = e => {
    const { id, payload } = e.data;

    try {

        // self.postMessage({ id, type: 'progress', value: 0.5 });

        self.postMessage({ id, type: 'done', result: true });
    } catch (error) {
        self.postMessage({ id, type: 'error', error });
    }
};
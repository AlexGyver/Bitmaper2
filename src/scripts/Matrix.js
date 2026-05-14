export default class Matrix {
    resize(w, h) {
        this.W = w;
        this.H = h;
        this.buf = new Int32Array(w * h);
    }

    set(x, y, v) {
        this.buf[y * this.W + x] = v;
    }

    get(x, y) {
        return this.buf[y * this.W + x];
    }

    getSafe(x, y) {
        return x >= 0 && x < this.W && y >= 0 && y < this.H ? this.get(x, y) : 0;
    }

    fill(v) {
        this.buf.fill(v);
    }

    clear() {
        this.fill(0);
    }

    copy() {
        let t = new Matrix();
        t.W = this.W;
        t.H = this.H;
        t.buf = new Int32Array(this.buf);
        return t;
    }
}
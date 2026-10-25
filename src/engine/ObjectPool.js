// src/engine/ObjectPool.js
// High-performance object pooling to avoid GC pauses and frame drops

export class ObjectPool {
  constructor(createFn, resetFn, initialSize = 30) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.active = [];

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  get(...args) {
    let obj;
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      // Pool empty, create new object
      obj = this.createFn();
    }
    if (this.resetFn) {
      this.resetFn(obj, ...args);
    }
    this.active.push(obj);
    return obj;
  }

  release(obj) {
    const index = this.active.indexOf(obj);
    if (index !== -1) {
      this.active.splice(index, 1);
      this.pool.push(obj);
    }
  }

  releaseAll() {
    while (this.active.length > 0) {
      const obj = this.active.pop();
      this.pool.push(obj);
    }
  }
}

/** Prevents a second swap from starting while the first is still resolving. */
export class InputGate {
  private locked = false;

  tryBegin(): boolean {
    if (this.locked) return false;
    this.locked = true;
    return true;
  }

  end(): void {
    this.locked = false;
  }

  get isLocked(): boolean {
    return this.locked;
  }
}

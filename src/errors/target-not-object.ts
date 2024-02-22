export class TargetNotObject extends Error {
    constructor(public readonly target: unknown) {
        super("Target is not an object");
    }
}

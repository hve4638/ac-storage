class AccessorManagerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AccessorManagerError';
    }
}

export default AccessorManagerError;
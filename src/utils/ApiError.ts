class ApiError extends Error{
    public success: boolean = false;
    public stack?: string | undefined;
    public data:any=null;
    constructor(public message: string, public status: number) {
        super(message);
        Object.defineProperty(this, 'message', {
            value: message,
            enumerable: true
        });
        this.message = message;
        this.status = status;
        this.success = false;        
    }
}

export default ApiError;
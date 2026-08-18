class ApiResponse {
    public success: boolean = true;
    constructor(public message: string, public status: number, public data: any) {
        this.message = message;
        this.status = status;
        this.success = true;
    }
}

export default ApiResponse;
class ApiResponse {
  constructor(statusCode, message = "Success", data = null, meta = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    if (data !== null) this.data = data;
    if (meta !== null) this.meta = meta;
  }
}

export default ApiResponse;

package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{Success: true, Data: data})
}

func SuccessWithMessage(c *gin.Context, message string, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{Success: true, Message: message, Data: data})
}

func Error(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, APIResponse{Success: false, Message: message})
}

func ValidationError(c *gin.Context, errors interface{}) {
	c.JSON(http.StatusUnprocessableEntity, APIResponse{Success: false, Message: "Validation failed", Errors: errors})
}

func NotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, APIResponse{Success: false, Message: message})
}

func InternalError(c *gin.Context) {
	c.JSON(http.StatusInternalServerError, APIResponse{Success: false, Message: "Internal server error"})
}

func Unauthorized(c *gin.Context) {
	c.JSON(http.StatusUnauthorized, APIResponse{Success: false, Message: "Unauthorized"})
}

func Forbidden(c *gin.Context) {
	c.JSON(http.StatusForbidden, APIResponse{Success: false, Message: "Forbidden"})
}

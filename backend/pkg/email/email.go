// Package email provides a simple email sender for QueueSmart.
// When SMTP_HOST is empty (development), emails are logged to stdout instead.
package email

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// Config holds SMTP credentials read from environment variables.
type Config struct {
	Host     string
	Port     string
	User     string
	Pass     string
	From     string
	AppURL   string
}

// FromEnv builds an email Config from environment variables.
func FromEnv() *Config {
	return &Config{
		Host:   os.Getenv("SMTP_HOST"),
		Port:   getEnvOrDefault("SMTP_PORT", "587"),
		User:   os.Getenv("SMTP_USER"),
		Pass:   os.Getenv("SMTP_PASS"),
		From:   getEnvOrDefault("SMTP_FROM", "QueueSmart <noreply@queuesmart.app>"),
		AppURL: getEnvOrDefault("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// SendInvite sends (or logs) a staff invitation email.
func (cfg *Config) SendInvite(toEmail, toName, venueName, role, token string) error {
	acceptURL := fmt.Sprintf("%s/accept-invite?token=%s", cfg.AppURL, token)

	subject := fmt.Sprintf("You're invited to join %s on QueueSmart", venueName)
	body := fmt.Sprintf(`Hello %s,

You have been invited to join "%s" on QueueSmart as %s.

Click the link below to accept your invitation and set up your account:

%s

This invitation link expires in 72 hours.

If you did not expect this invitation, you can safely ignore this email.

— The QueueSmart Team
`, toName, venueName, role, acceptURL)

	if cfg.Host == "" {
		// Development fallback: print to console
		log.Printf("\n\n========== STAFF INVITATION (dev mode — no SMTP configured) ==========")
		log.Printf("  To:      %s <%s>", toName, toEmail)
		log.Printf("  Venue:   %s", venueName)
		log.Printf("  Role:    %s", role)
		log.Printf("  Link:    %s", acceptURL)
		log.Printf("=======================================================================\n")
		return nil
	}

	// Build raw message
	msg := buildMessage(cfg.From, toEmail, subject, body)

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	if err := smtp.SendMail(addr, auth, extractAddr(cfg.From), []string{toEmail}, []byte(msg)); err != nil {
		log.Printf("[email] Failed to send invite to %s: %v", toEmail, err)
		return err
	}

	log.Printf("[email] Invitation sent to %s", toEmail)
	return nil
}

// SendVerificationEmail sends an email-verification link to a newly registered user.
func (cfg *Config) SendVerificationEmail(toEmail, toName, code string) error {
	verifyURL := fmt.Sprintf("%s/verify-email?code=%s", cfg.AppURL, code)

	subject := "Verify your QueueSmart email address"
	body := fmt.Sprintf(`Hi %s,

Thanks for signing up for QueueSmart! Please verify your email address by clicking the link below:

%s

This link expires in 24 hours.

If you did not create an account, you can safely ignore this email.

— The QueueSmart Team
`, toName, verifyURL)

	if cfg.Host == "" {
		// Development fallback — print to console so developers can click the link
		log.Printf("\n\n========== EMAIL VERIFICATION (dev mode — no SMTP configured) ==========")
		log.Printf("  To:   %s <%s>", toName, toEmail)
		log.Printf("  Link: %s", verifyURL)
		log.Printf("=========================================================================\n")
		return nil
	}

	msg := buildMessage(cfg.From, toEmail, subject, body)
	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	if err := smtp.SendMail(addr, auth, extractAddr(cfg.From), []string{toEmail}, []byte(msg)); err != nil {
		log.Printf("[email] Failed to send verification email to %s: %v", toEmail, err)
		return err
	}

	log.Printf("[email] Verification email sent to %s", toEmail)
	return nil
}

// SendResetPasswordEmail sends a password-reset link to the user.
func (cfg *Config) SendResetPasswordEmail(toEmail, toName, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password?token=%s", cfg.AppURL, token)

	subject := "Reset your QueueSmart password"
	body := fmt.Sprintf(`Hi %s,

We received a request to reset the password for your QueueSmart account.

Click the link below to choose a new password:

%s

This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email — your password will not change.

— The QueueSmart Team
`, toName, resetURL)

	if cfg.Host == "" {
		log.Printf("\n\n========== PASSWORD RESET (dev mode — no SMTP configured) ==========")
		log.Printf("  To:   %s <%s>", toName, toEmail)
		log.Printf("  Link: %s", resetURL)
		log.Printf("=====================================================================\n")
		return nil
	}

	msg := buildMessage(cfg.From, toEmail, subject, body)
	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)

	if err := smtp.SendMail(addr, auth, extractAddr(cfg.From), []string{toEmail}, []byte(msg)); err != nil {
		log.Printf("[email] Failed to send reset email to %s: %v", toEmail, err)
		return err
	}

	log.Printf("[email] Password reset email sent to %s", toEmail)
	return nil
}


// buildMessage formats a plain-text SMTP message.
func buildMessage(from, to, subject, body string) string {
	headers := strings.Join([]string{
		"From: " + from,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
	}, "\r\n")
	return headers + "\r\n\r\n" + body
}

// extractAddr strips the display name and returns the bare email address.
// e.g. "QueueSmart <noreply@example.com>" → "noreply@example.com"
func extractAddr(from string) string {
	if start := strings.Index(from, "<"); start != -1 {
		end := strings.Index(from, ">")
		if end > start {
			return from[start+1 : end]
		}
	}
	return from
}

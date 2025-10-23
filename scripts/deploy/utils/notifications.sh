#!/bin/bash

##############################################################################
# Notification Utilities
#
# Send deployment notifications via multiple channels:
#   - Slack
#   - Email
#   - Discord
#   - Webhook
##############################################################################

# Load environment variables
ENV_FILE="${PROJECT_ROOT:-.}/.env.${ENVIRONMENT:-staging}"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
fi

send_notification() {
    local level="$1"  # info, success, warning, error, critical
    local message="$2"

    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        send_slack_notification "$level" "$message"
    fi

    # Email notification
    if [ -n "${NOTIFICATION_EMAIL:-}" ]; then
        send_email_notification "$level" "$message"
    fi

    # Discord notification
    if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        send_discord_notification "$level" "$message"
    fi

    # Generic webhook
    if [ -n "${NOTIFICATION_WEBHOOK_URL:-}" ]; then
        send_webhook_notification "$level" "$message"
    fi
}

send_slack_notification() {
    local level="$1"
    local message="$2"

    # Map level to color
    local color="good"
    case "$level" in
        success) color="good" ;;
        warning) color="warning" ;;
        error|critical) color="danger" ;;
        *) color="#0099ff" ;;
    esac

    # Get hostname and user
    local hostname=$(hostname)
    local user=$(whoami)

    # Build Slack payload
    local payload=$(cat <<EOF
{
    "username": "Deployment Bot",
    "icon_emoji": ":rocket:",
    "attachments": [
        {
            "color": "$color",
            "title": "Deployment Notification",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Level",
                    "value": "$level",
                    "short": true
                },
                {
                    "title": "Host",
                    "value": "$hostname",
                    "short": true
                },
                {
                    "title": "User",
                    "value": "$user",
                    "short": true
                }
            ],
            "footer": "NOA Server Deployment",
            "ts": $(date +%s)
        }
    ]
}
EOF
)

    # Send to Slack
    curl -s -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
}

send_email_notification() {
    local level="$1"
    local message="$2"

    # Only send email for important notifications
    if [ "$level" != "info" ]; then
        local subject="[${level^^}] NOA Server Deployment - $ENVIRONMENT"
        local body="$message\n\nEnvironment: $ENVIRONMENT\nHost: $(hostname)\nUser: $(whoami)\nTime: $(date)"

        # Send email using mail command if available
        if command -v mail &> /dev/null; then
            echo -e "$body" | mail -s "$subject" "$NOTIFICATION_EMAIL" 2>/dev/null || true
        fi
    fi
}

send_discord_notification() {
    local level="$1"
    local message="$2"

    # Map level to color
    local color="5814783"  # Blue
    case "$level" in
        success) color="5763719" ;;  # Green
        warning) color="16705372" ;; # Orange
        error|critical) color="15548997" ;; # Red
    esac

    # Build Discord payload
    local payload=$(cat <<EOF
{
    "embeds": [
        {
            "title": "Deployment Notification",
            "description": "$message",
            "color": $color,
            "fields": [
                {
                    "name": "Environment",
                    "value": "$ENVIRONMENT",
                    "inline": true
                },
                {
                    "name": "Level",
                    "value": "$level",
                    "inline": true
                }
            ],
            "footer": {
                "text": "NOA Server Deployment"
            },
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        }
    ]
}
EOF
)

    # Send to Discord
    curl -s -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
}

send_webhook_notification() {
    local level="$1"
    local message="$2"

    # Build generic webhook payload
    local payload=$(cat <<EOF
{
    "level": "$level",
    "message": "$message",
    "environment": "$ENVIRONMENT",
    "host": "$(hostname)",
    "user": "$(whoami)",
    "timestamp": $(date +%s)
}
EOF
)

    # Send to webhook
    curl -s -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$NOTIFICATION_WEBHOOK_URL" > /dev/null 2>&1 || true
}

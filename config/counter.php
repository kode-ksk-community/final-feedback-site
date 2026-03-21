<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Counter Device Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for counter device behavior, polling intervals,
    | timeouts, and operational parameters.
    |
    */

    'polling' => [
        'interval_ms' => env('COUNTER_POLL_INTERVAL_MS', 4000),
        'timeout_ms' => env('COUNTER_POLL_TIMEOUT_MS', 8000),
        'max_retries' => env('COUNTER_MAX_RETRIES', 3),
        'retry_delay_ms' => env('COUNTER_RETRY_DELAY_MS', 1000),
    ],

    'session' => [
        'max_duration_hours' => env('COUNTER_MAX_SESSION_HOURS', 12),
        'auto_timeout_minutes' => env('COUNTER_AUTO_TIMEOUT_MINUTES', 30),
        'grace_period_minutes' => env('COUNTER_GRACE_PERIOD_MINUTES', 5),
    ],

    'feedback' => [
        'thank_you_duration_seconds' => env('FEEDBACK_THANK_YOU_DURATION', 4),
        'welcome_delay_ms' => env('FEEDBACK_WELCOME_DELAY_MS', 800),
        'max_comment_length' => env('FEEDBACK_MAX_COMMENT_LENGTH', 1000),
        'max_tags_per_feedback' => env('FEEDBACK_MAX_TAGS', 5),
    ],

    'security' => [
        'device_token_length' => env('DEVICE_TOKEN_LENGTH', 64),
        'pin_min_length' => env('PIN_MIN_LENGTH', 4),
        'pin_max_length' => env('PIN_MAX_LENGTH', 6),
        'session_ip_tracking' => env('SESSION_IP_TRACKING', true),
    ],

    'ui' => [
        'clock_update_interval_ms' => env('CLOCK_UPDATE_INTERVAL_MS', 1000),
        'animation_duration_ms' => env('ANIMATION_DURATION_MS', 300),
        'loading_timeout_ms' => env('LOADING_TIMEOUT_MS', 10000),
    ],

    'rate_limiting' => [
        'info_endpoint_requests' => env('RATE_LIMIT_INFO_REQUESTS', 5),
        'info_endpoint_minutes' => env('RATE_LIMIT_INFO_MINUTES', 1),
        'activation_guest_requests' => env('RATE_LIMIT_ACTIVATION_GUEST', 3),
        'activation_guest_minutes' => env('RATE_LIMIT_ACTIVATION_GUEST_MINUTES', 1),
    ],

    'cache' => [
        'branch_counters_ttl' => env('CACHE_BRANCH_COUNTERS_TTL', 300), // 5 minutes
        'feedback_tags_ttl' => env('CACHE_FEEDBACK_TAGS_TTL', 600), // 10 minutes
        'analytics_ttl' => env('CACHE_ANALYTICS_TTL', 1800), // 30 minutes
    ],

    'features' => [
        'enable_sentiment_analysis' => env('ENABLE_SENTIMENT_ANALYSIS', true),
        'enable_auto_logout' => env('ENABLE_AUTO_LOGOUT', true),
        'enable_offline_mode' => env('ENABLE_OFFLINE_MODE', false),
        'enable_debug_logging' => env('ENABLE_DEBUG_LOGGING', false),
    ],

];

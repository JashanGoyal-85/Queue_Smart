package redis

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(url string) *redis.Client {
	opts, err := redis.ParseURL(url)
	if err != nil {
		opts = &redis.Options{Addr: "localhost:6379"}
	}
	return redis.NewClient(opts)
}

func SetWithExpiry(ctx context.Context, client *redis.Client, key string, value interface{}, expiry time.Duration) error {
	return client.Set(ctx, key, value, expiry).Err()
}

func Get(ctx context.Context, client *redis.Client, key string) (string, error) {
	return client.Get(ctx, key).Result()
}

func Delete(ctx context.Context, client *redis.Client, keys ...string) error {
	return client.Del(ctx, keys...).Err()
}

func Publish(ctx context.Context, client *redis.Client, channel string, message interface{}) error {
	return client.Publish(ctx, channel, message).Err()
}

func Exists(ctx context.Context, client *redis.Client, key string) (bool, error) {
	n, err := client.Exists(ctx, key).Result()
	return n > 0, err
}

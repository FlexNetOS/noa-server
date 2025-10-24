"""
NOA Server Python Client
Complete client library for all API endpoints
"""

import json
import requests
from typing import Dict, List, Optional, Union
from dataclasses import dataclass


@dataclass
class Message:
    role: str
    content: str


@dataclass
class ChatConfig:
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0
    stream: bool = False


class NoaClient:
    """NOA Server API Client"""

    def __init__(self, base_url: str = "http://localhost:3000/api/v1", api_key: Optional[str] = None):
        self.base_url = base_url
        self.api_key = api_key
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.session = requests.Session()

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with authentication"""
        headers = {"Content-Type": "application/json"}

        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        elif self.api_key:
            headers["X-API-Key"] = self.api_key

        return headers

    def _request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with authentication"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers()

        if "headers" in kwargs:
            headers.update(kwargs.pop("headers"))

        response = self.session.request(method, url, headers=headers, **kwargs)

        # Auto-refresh token on 401
        if response.status_code == 401 and self.refresh_token:
            self.refresh_access_token()
            headers = self._get_headers()
            response = self.session.request(method, url, headers=headers, **kwargs)

        return response

    # Authentication

    def register(self, email: str, password: str, metadata: Optional[Dict] = None) -> Dict:
        """Register new user"""
        response = self._request(
            "POST",
            "/auth/register",
            json={"email": email, "password": password, "metadata": metadata or {}},
        )
        response.raise_for_status()
        return response.json()

    def login(self, email: str, password: str, mfa_code: Optional[str] = None) -> Dict:
        """Login with email and password"""
        payload = {"email": email, "password": password}
        if mfa_code:
            payload["mfaCode"] = mfa_code

        response = self._request("POST", "/auth/login", json=payload)
        response.raise_for_status()
        data = response.json()

        if data.get("success"):
            self.access_token = data["token"]["accessToken"]
            self.refresh_token = data["token"]["refreshToken"]

        return data

    def logout(self) -> None:
        """Logout current session"""
        self._request("POST", "/auth/logout")
        self.access_token = None
        self.refresh_token = None

    def refresh_access_token(self) -> str:
        """Refresh access token"""
        if not self.refresh_token:
            raise ValueError("No refresh token available")

        response = self._request("POST", "/auth/refresh", json={"refreshToken": self.refresh_token})
        response.raise_for_status()
        data = response.json()

        self.access_token = data["accessToken"]
        self.refresh_token = data.get("refreshToken", self.refresh_token)

        return self.access_token

    def create_api_key(self, name: str, expires_in: Optional[int] = None, scopes: Optional[List[str]] = None) -> Dict:
        """Create new API key"""
        payload = {"name": name}
        if expires_in:
            payload["expiresIn"] = expires_in
        if scopes:
            payload["scopes"] = scopes

        response = self._request("POST", "/auth/api-keys", json=payload)
        response.raise_for_status()
        return response.json()

    # AI Inference

    def chat_completion(
        self, messages: List[Message], model: str = "gpt-4", config: Optional[ChatConfig] = None
    ) -> Dict:
        """Generate chat completion"""
        config = config or ChatConfig()

        payload = {
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "model": model,
            "config": {
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "top_p": config.top_p,
                "stream": config.stream,
            },
        }

        response = self._request("POST", "/inference/chat", json=payload)
        response.raise_for_status()
        return response.json()

    def chat_completion_stream(self, messages: List[Message], model: str = "gpt-4", config: Optional[ChatConfig] = None):
        """Generate streaming chat completion"""
        config = config or ChatConfig(stream=True)

        payload = {
            "messages": [{"role": msg.role, "content": msg.content} for msg in messages],
            "model": model,
            "config": {
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "stream": True,
            },
        }

        response = self._request("POST", "/inference/stream", json=payload, stream=True)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                line = line.decode("utf-8")
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        content = chunk["choices"][0].get("delta", {}).get("content")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    def create_embedding(self, input_text: Union[str, List[str]], model: str = "text-embedding-ada-002") -> Dict:
        """Generate text embeddings"""
        response = self._request("POST", "/inference/embeddings", json={"input": input_text, "model": model})
        response.raise_for_status()
        return response.json()

    def list_models(self) -> Dict:
        """List available models"""
        response = self._request("GET", "/models")
        response.raise_for_status()
        return response.json()

    def switch_model(self, provider: str, model: str) -> Dict:
        """Switch active model"""
        response = self._request("POST", "/models/switch", json={"provider": provider, "model": model})
        response.raise_for_status()
        return response.json()

    # Message Queue

    def publish_message(
        self,
        queue: str,
        payload: Dict,
        priority: str = "normal",
        ttl: Optional[int] = None,
        delay: Optional[int] = None,
    ) -> Dict:
        """Publish message to queue"""
        data = {"queue": queue, "payload": payload, "priority": priority}

        if ttl:
            data["ttl"] = ttl
        if delay:
            data["delay"] = delay

        response = self._request("POST", "/queue/publish", json=data)
        response.raise_for_status()
        return response.json()

    def consume_messages(self, queue: str, limit: int = 1, timeout: int = 20) -> Dict:
        """Consume messages from queue"""
        params = {"queue": queue, "limit": limit, "timeout": timeout}
        response = self._request("GET", "/queue/consume", params=params)
        response.raise_for_status()
        return response.json()

    def acknowledge_message(self, receipt_handle: str) -> None:
        """Acknowledge message processing"""
        response = self._request("POST", "/queue/ack", json={"receiptHandle": receipt_handle})
        response.raise_for_status()

    def get_queue_status(self, queue: str) -> Dict:
        """Get queue status"""
        response = self._request("GET", "/queue/status", params={"queue": queue})
        response.raise_for_status()
        return response.json()

    # Monitoring

    def health_check(self) -> Dict:
        """Get health status"""
        response = requests.get(f"{self.base_url.rsplit('/api', 1)[0]}/health")
        response.raise_for_status()
        return response.json()

    def get_metrics(self) -> Dict:
        """Get JSON metrics"""
        response = self._request("GET", "/metrics")
        response.raise_for_status()
        return response.json()


# Example usage
if __name__ == "__main__":
    # Initialize client
    client = NoaClient()

    # Login
    login_result = client.login("user@example.com", "SecureP@ssw0rd123!")
    print(f"Logged in as: {login_result['user']['email']}")

    # Chat completion
    messages = [
        Message(role="system", content="You are a helpful AI assistant."),
        Message(role="user", content="What is the capital of France?"),
    ]

    response = client.chat_completion(messages, model="gpt-4")
    print(f"\nResponse: {response['choices'][0]['message']['content']}")
    print(f"Tokens used: {response['usage']['total_tokens']}")

    # Streaming example
    print("\nStreaming response:")
    messages.append(Message(role="user", content="Tell me a short story."))
    for chunk in client.chat_completion_stream(messages):
        print(chunk, end="", flush=True)
    print()

    # Publish to queue
    message_id = client.publish_message("ai-inference", {"type": "batch_process", "items": 100}, priority="high")
    print(f"\nPublished message: {message_id}")

    # Health check
    health = client.health_check()
    print(f"\nSystem status: {health['status']}")

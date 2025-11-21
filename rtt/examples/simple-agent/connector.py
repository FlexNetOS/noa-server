#!/usr/bin/env python3
"""Simple RTT connector example."""

class Connector:
    def probe(self, root):
        return [{'saddr': 'rtt://agent/myapp/worker@1.0.0'}]

    def open(self, symbol, params):
        return {'handle': 'worker-1'}

    def tx(self, handle, data):
        print(f"TX: {data}")

    def rx(self, handle):
        return b'{"status": "ok"}'

    def close(self, handle):
        pass

    def health(self, handle):
        return {'ok': True}

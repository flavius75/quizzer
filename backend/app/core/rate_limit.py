"""Shared rate limiter instance.

Lives here (rather than being created inside routes/auth.py, which is where
it originally lived) so any route module can apply @limiter.limit(...)
without importing one route module from another.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

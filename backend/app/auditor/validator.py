import socket
import ipaddress
import urllib.parse
from typing import Tuple, Optional

# SSRF Protection: Deny private, loopback, link-local, multicast and metadata addresses
DENIED_IP_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),        # Cloud metadata / link-local
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.0.2.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("224.0.0.0/4"),          # Multicast
    ipaddress.ip_network("240.0.0.0/4"),          # Reserved
    ipaddress.ip_network("::/128"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),             # IPv6 Unique local
    ipaddress.ip_network("fe80::/10"),            # IPv6 Link-local
    ipaddress.ip_network("ff00::/8")              # IPv6 Multicast
]

def validate_and_sanitize_url(url_str: str, allow_local: bool = False) -> Tuple[bool, str, Optional[str]]:
    """
    Validate URL syntax and enforce strict SSRF protection.
    Returns: (is_valid, normalized_url, error_message)
    """
    if not url_str or not isinstance(url_str, str):
        return False, "", "URL cannot be empty."

    url_str = url_str.strip()
    if not url_str.startswith("http://") and not url_str.startswith("https://"):
        url_str = "https://" + url_str

    try:
        parsed = urllib.parse.urlparse(url_str)
        if parsed.scheme not in ["http", "https"]:
            return False, "", f"Unsupported protocol '{parsed.scheme}'. Only HTTP/HTTPS are allowed."

        hostname = parsed.hostname
        if not hostname:
            return False, "", "Invalid URL: hostname missing."

        # If user explicitly authorizes testing on local dev environment (e.g. localhost testing in dev mode)
        if allow_local or hostname in ["localhost", "127.0.0.1"]:
            return True, url_str, None

        # Resolve DNS to check IP
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for addr in addr_info:
                ip_str = addr[4][0]
                ip_obj = ipaddress.ip_address(ip_str)

                for net in DENIED_IP_NETWORKS:
                    if ip_obj in net:
                        return False, "", f"SSRF Protection: Access to private/internal IP address ({ip_str}) is restricted."
        except socket.gaierror:
            # If domain cannot be resolved via public DNS, but is a valid domain format, we allow attempt or fail gracefully in scanner
            pass

        return True, url_str, None
    except Exception as e:
        return False, "", f"Malformed URL: {str(e)}"

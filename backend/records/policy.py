MAX_POLICY_DEPTH = 8
MAX_POLICY_TERMS = 32


def validate_policy(policy):
    count = [0]

    def visit(node, depth):
        if depth > MAX_POLICY_DEPTH:
            raise ValueError("Policy is too deeply nested.")
        if isinstance(node, str):
            count[0] += 1
            if count[0] > MAX_POLICY_TERMS or ":" not in node:
                raise ValueError("Policy has too many or malformed attributes.")
            key, value = node.split(":", 1)
            if not key.strip() or not value.strip() or len(node) > 160:
                raise ValueError("Policy attribute is invalid.")
            return
        if not isinstance(node, dict) or len(node) != 1:
            raise ValueError("Each policy node must be an attribute, all, or any expression.")
        operator, children = next(iter(node.items()))
        if operator not in ("all", "any") or not isinstance(children, list) or not children:
            raise ValueError("Policy expressions must use a non-empty all/any list.")
        for child in children:
            visit(child, depth + 1)

    visit(policy, 0)
    return policy


def policy_allows(policy, attributes):
    if isinstance(policy, str):
        return policy in attributes
    operator, children = next(iter(policy.items()))
    if operator == "all":
        return all(policy_allows(child, attributes) for child in children)
    return any(policy_allows(child, attributes) for child in children)

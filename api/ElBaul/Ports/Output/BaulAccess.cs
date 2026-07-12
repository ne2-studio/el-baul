namespace ElBaul.Ports.Output;

/// <summary>
/// A baul shared with a user, paired with the role that access grants them.
/// Returned by IBaulRepository.GetSharedForUserAsync so callers don't need a
/// separate lookup per baul to know the caller's role.
/// </summary>
public record BaulAccess(Baul Baul, BaulRole Role);

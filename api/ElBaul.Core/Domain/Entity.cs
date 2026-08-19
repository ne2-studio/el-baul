namespace ElBaul.Domain;

/// <summary>Base for persistent domain entities whose identity is their typed id.</summary>
public abstract class Entity<TId>(TId id) : IEquatable<Entity<TId>>
    where TId : struct, IEquatable<TId>
{
    public TId Id { get; private set; } = id;

    public bool Equals(Entity<TId>? other) => other is not null && Id.Equals(other.Id);
    public override bool Equals(object? obj) => obj is Entity<TId> other && Equals(other);
    public override int GetHashCode() => Id.GetHashCode();
    public static bool operator ==(Entity<TId>? left, Entity<TId>? right) =>
        ReferenceEquals(left, right) || (left is not null && left.Equals(right));
    public static bool operator !=(Entity<TId>? left, Entity<TId>? right) => !(left == right);
}

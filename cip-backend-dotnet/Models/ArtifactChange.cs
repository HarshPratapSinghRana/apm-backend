namespace CipBackend.Models;

public class ArtifactChange
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ArtifactId { get; set; } = string.Empty;
    public string ProducerEmail { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}

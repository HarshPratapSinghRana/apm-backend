using System;
using System.Collections.Generic;

namespace EngineeringCommons.Backend.Models;

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
[Newtonsoft.Json.JsonConverter(typeof(Newtonsoft.Json.Converters.StringEnumConverter))]
public enum ArtifactChangeType
{
    NewArtifact,
    Modified,
    NoChanges
}

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
[Newtonsoft.Json.JsonConverter(typeof(Newtonsoft.Json.Converters.StringEnumConverter))]
public enum ChangeType
{
    Added,
    Deleted,
    Modified,
    Unchanged
}

[System.Text.Json.Serialization.JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
[Newtonsoft.Json.JsonConverter(typeof(Newtonsoft.Json.Converters.StringEnumConverter))]
public enum LineChangeType
{
    Added,
    Deleted,
    Unchanged
}

public class LineChange
{
    public int? OldLineNumber { get; set; }
    public int? NewLineNumber { get; set; }
    public LineChangeType Type { get; set; }
    public string Content { get; set; } = string.Empty;
}

public class ArtifactFileDiff
{
    public string Path { get; set; } = string.Empty;
    public ChangeType ChangeType { get; set; }
    public string? OldContent { get; set; }
    public string? NewContent { get; set; }
    public List<LineChange> LineChanges { get; set; } = new();
    public int AddedLinesCount { get; set; }
    public int DeletedLinesCount { get; set; }
}

public class ArtifactDiff
{
    public string? ReviewId { get; set; }
    public string ArtifactName { get; set; } = string.Empty;
    public string? CurrentVersion { get; set; }
    public string? SubmittedVersion { get; set; }
    public string? ProducerEmail { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public ArtifactChangeType ArtifactChangeType { get; set; } = ArtifactChangeType.Modified;
    public bool IsNewArtifact => ArtifactChangeType == ArtifactChangeType.NewArtifact;
    public int FilesChangedCount { get; set; }
    public int AddedFilesCount { get; set; }
    public int ModifiedFilesCount { get; set; }
    public int DeletedFilesCount { get; set; }
    public int UnchangedFilesCount { get; set; }
    public List<ArtifactFileDiff> Files { get; set; } = new();
}

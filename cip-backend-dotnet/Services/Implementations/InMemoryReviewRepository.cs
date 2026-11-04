using CipBackend.Models;
using CipBackend.Services.Interfaces;

namespace CipBackend.Services.Implementations;

public class InMemoryReviewRepository : IReviewRepository
{
    private readonly List<Review> _reviews = new();
    public void Add(Review r) => _reviews.Add(r);
    public Review? Get(string id) => _reviews.FirstOrDefault(r => r.Id == id);
    public IEnumerable<Review> List() => _reviews;
}

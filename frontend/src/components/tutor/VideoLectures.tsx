import { useEffect, useState } from 'react';
import { getVideos, type Video } from '../../api/tutor.api';

export default function VideoLectures() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredVideo, setFeaturedVideo] = useState<Video | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const data = await getVideos();
        setVideos(data);
        if (data.length > 0) {
          setFeaturedVideo(data[0]);
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const categories = [
    'All',
    ...new Set(videos.map((v) => v.category).filter(Boolean)),
  ];

  const filteredVideos =
    selectedCategory === 'All'
      ? videos
      : videos.filter((v) => v.category === selectedCategory);

  const getVideoId = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    );
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text/60 dark:text-gray-400">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Video */}
      {featuredVideo && (
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
            Featured Video
          </h2>
          <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${getVideoId(featuredVideo.url)}`}
              title={featuredVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-text dark:text-white mb-1">
              {featuredVideo.title}
            </h3>
            <p className="text-sm text-text/60 dark:text-gray-400">
              {featuredVideo.channel}
            </p>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              selectedCategory === category
                ? 'bg-pastel-green/40 dark:bg-green-700/40 text-text dark:text-white font-medium'
                : 'bg-white/80 dark:bg-gray-800/80 text-text/60 dark:text-gray-300 hover:bg-pastel-orange/20 dark:hover:bg-gray-700 border border-pastel-tan/20 dark:border-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map((video) => {
          const videoId = getVideoId(video.url);
          return (
            <div
              key={video.id}
              className="bg-white/80 dark:bg-gray-800/80 rounded-2xl overflow-hidden shadow-soft border border-pastel-tan/20 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setFeaturedVideo(video)}
            >
              <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
                {videoId ? (
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text dark:text-white mb-1 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-sm text-text/60 dark:text-gray-400">
                  {video.channel}
                </p>
                {video.category && (
                  <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-pastel-blue/20 dark:bg-blue-900/30 text-text/70 dark:text-gray-300">
                    {video.category}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-12 text-text/60 dark:text-gray-400">
          No videos found in this category.
        </div>
      )}
    </div>
  );
}
